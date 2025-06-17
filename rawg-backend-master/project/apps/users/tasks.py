from datetime import timedelta

import dateutil
from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import MultipleObjectsReturned
from django.db import IntegrityError, transaction
from django.utils.timezone import now
from psycopg2 import errorcodes

from apps.celery import app as celery
from apps.common.cache import CommonContentType
from apps.feedback.models import Feedback
from apps.games.models import Game
from apps.pusher.models import Notification
from apps.stat.models import Visit
from apps.users.models import UserFollowElement, UserGame
from apps.utils.celery import lock
from apps.utils.dates import midnight
from apps.utils.dicts import find
from apps.utils.ganalytics import HitClient

user_lock_id = 'apps.users.tasks:users:{}'


@celery.task(
    time_limit=30, bind=True, ignore_result=True, max_retries=5, default_retry_delay=5,
    acks_late=True, reject_on_worker_lost=True
)
def update_user_followers(self, user_id):
    from apps.users.signals import user_fields_updated

    with lock(user_lock_id.format(user_id), self.app.oid) as acquired:
        if not acquired:
            self.retry()
        try:
            user = get_user_model().objects.only('id', 'followers_count', 'following_count').get(id=user_id)
        except get_user_model().DoesNotExist:
            return
        ct = CommonContentType().get(get_user_model())
        kwargs = {
            'followers_count': UserFollowElement.objects.filter(object_id=user.id, content_type=ct).count(),
            'following_count': UserFollowElement.objects.filter(user_id=user.id, content_type=ct).count(),
        }
        get_user_model().objects.filter(id=user_id).update(**kwargs)
        user_fields_updated.send(
            sender=user.__class__, pk=user_id,
            fields_was={'followers_count': user.followers_count, 'following_count': user.following_count},
            fields=kwargs
        )


@celery.task(
    time_limit=90, bind=True, ignore_result=True, max_retries=3, default_retry_delay=65,
    acks_late=True, reject_on_worker_lost=True
)
def update_user_statistics(self, user_id, targets):
    with lock(user_lock_id.format(f'statistics:{user_id}'), self.app.oid) as acquired:
        if not acquired:
            return
        try:
            user = get_user_model().objects.only('id', 'statistics', 'settings').get(id=user_id)
        except get_user_model().DoesNotExist:
            return
        if (
            settings.USERS_STATISTICS_LIMIT
            and (user.statistics or {}).get('updated')
            and dateutil.parser.parse(user.statistics['updated']) > (now() - timedelta(minutes=1))
        ):
            if self.request.retries == 1:
                return
            self.retry()
        try:
            user.set_statistics(targets)
        except UserGame.game.RelatedObjectDoesNotExist:
            self.retry()


@celery.task(time_limit=60, bind=True, ignore_result=True)
def update_last_entered(self, user_id):
    with lock(user_lock_id.format(user_id), self.app.oid) as acquired:
        if not acquired:
            return
        try:
            user = get_user_model().objects.only('id', 'last_entered').get(id=user_id)
        except get_user_model().DoesNotExist:
            return
        if user.last_entered:
            if now() - user.last_entered < timedelta(minutes=5):
                return
            if midnight(user.last_entered) != midnight():
                from apps.merger.tasks import sync_user
                sync_user(user.id, is_fast=2)
        get_user_model().objects.filter(id=user_id).update(last_entered=now())
        Visit.objects.create(user_id=user_id)


@celery.task(time_limit=10, bind=True, ignore_result=True)
def feedback_propose(self, user_id):
    with lock('apps.users.tasks.feedback_propose.{}'.format(user_id), self.app.oid) as acquired:
        if not acquired:
            return
        user = get_user_model().objects.get(id=user_id)
        user.feedback_propose = True
        if not Feedback.objects.filter(user=user).count():
            send_feedback_propose.apply_async((user_id,), countdown=90)
        user.save()


@celery.task(time_limit=10, ignore_result=True)
def send_feedback_propose(user_id):
    try:
        Notification.get_or_create(get_user_model().objects.get(id=user_id), 'feedback-propose', {}, True)
    except (MultipleObjectsReturned, get_user_model().DoesNotExist):
        pass


@celery.task(soft_time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def save_games(ratings, user_id):
    from apps.games.models import Game
    from apps.reviews.models import Review
    from apps.users.models import UserGame

    results = []
    game_ids = [rating['id'] for rating in ratings]

    for rating in ratings:
        results.append({
            'user_id': user_id,
            'game_id': rating['id'],
            'rating': rating['rating'],
        })

    for result in results:
        try:
            with transaction.atomic():
                review = Review.objects.filter(
                    user_id=result['user_id'],
                    game_id=result['game_id'],
                ).first()
                if review:
                    review.rating = result['rating']
                    review.save(update_fields=['rating'])
                else:
                    Review.objects.create(**result)
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
        except (get_user_model().DoesNotExist, Game.DoesNotExist):
            pass

    for game_id in game_ids:
        try:
            with transaction.atomic():
                UserGame.objects.get_or_create(
                    user_id=user_id,
                    game_id=game_id,
                )
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
        except (get_user_model().DoesNotExist, Game.DoesNotExist):
            pass


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def add_games_to_library(user_id, game_id):
    UserGame.objects.get_or_create(
        user_id=user_id,
        game_id=game_id
    )


@celery.task(time_limit=60, ignore_result=True)
def save_user_setting(user_id, key, value):
    try:
        user = get_user_model().objects.only('id', 'settings').get(id=user_id)
    except get_user_model().DoesNotExist:
        return
    if not user.settings:
        user.settings = {}
    user.settings[key] = value
    user.save(update_fields=['settings'])


@celery.task(time_limit=60, ignore_result=True)
def save_user_follow_element_last_viewed_id(user_id, object_id, content_type_id, last_viewed_id):
    try:
        el = UserFollowElement.objects.get(user_id=user_id, object_id=object_id, content_type_id=content_type_id)
    except UserFollowElement.DoesNotExist:
        return
    el.last_viewed_id = last_viewed_id
    el.save(update_fields=['last_viewed_id'])


@celery.task(time_limit=120, ignore_result=True)
def save_user_follow_element_last_viewed_ids(user_id):
    data = []
    for el in UserFollowElement.objects.elements(user_id):
        model = el.content_type.model_class()
        qs = UserFollowElement.INSTANCES_GAME_QUERIES.get(model)
        table = UserFollowElement.INSTANCES_ID_TABLES.get(el.content_type.model)
        kwargs, _ = qs(el.object_id)
        game = Game.objects.defer_all().filter(**kwargs).extra(
            order_by=[f'-{table}.id'],
            select={'relation_id': f'{table}.id'}
        ).first()
        if not game or el.last_viewed_id == game.relation_id:
            continue
        el.last_viewed_id = game.relation_id
        data.append(el)
    UserFollowElement.objects.bulk_update(data, ['last_viewed_id'])


@celery.task(time_limit=60, ignore_result=True)
def save_user_last_games_show_similar(user_id, game_id):
    try:
        user = get_user_model().objects.get(id=user_id)
    except get_user_model().DoesNotExist:
        return
    if game_id not in user.last_visited_games_ids:
        user.last_visited_games_ids.insert(0, game_id)
        user.last_visited_games_ids = user.last_visited_games_ids[:10]
        user.save(update_fields=['last_visited_games_ids'])


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def because_you_completed(user_id, game_id=None, exclude=None):
    try:
        user = get_user_model().objects.only('settings').get(id=user_id)
    except get_user_model().DoesNotExist:
        return

    default_game_id = game_id
    if not game_id:
        qs = UserGame.objects.only('game_id').filter(user_id=user_id, status=UserGame.STATUS_BEATEN)
        if exclude:
            qs = qs.exclude(game_id__in=exclude)
        user_game = qs.order_by('-added').first()
        if not user_game:
            return
        game_id = user_game.game_id

    game = Game.objects.defer_all('suggestions').get(id=game_id)
    data = {'game_id': game.id}

    ids = find(game.suggestions, 'games', [])
    game_ids = set(UserGame.objects.filter(user_id=user_id, game_id__in=ids).values_list('game_id', flat=True))
    game_ids.update(Game.objects.filter(rating__lt=3, id__in=ids).values_list('id', flat=True))
    data['ids'] = [pk for pk in ids if pk not in game_ids][:50]

    if not data['ids']:
        if not default_game_id:
            if not exclude:
                exclude = []
            elif len(exclude) == 5:
                return
            exclude.append(game_id)
            return because_you_completed(user_id, exclude=exclude)
        return

    if not user.settings:
        user.settings = {}
    user.settings['games_because_you_completed'] = data
    user.save(update_fields=['settings'])


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def save_user_platforms(user_id):
    try:
        user = get_user_model().objects.only('settings').get(id=user_id)
    except get_user_model().DoesNotExist:
        return
    if not user.settings:
        user.settings = {}
    user.settings['users_platforms'] = user.get_platforms() or user.get_game_platforms()
    user.save(update_fields=['settings'])


@celery.task(time_limit=10, ignore_result=True)
def ga_auth_signup(user_id, ip=None, ua=None, al=None, cid=None, language=''):
    ga = getattr(settings, f'GA_ANALYTICS_{language.upper()}')
    if not ga:
        return
    client = HitClient(ga, ip, ua, al, cid, 'Authenticated')
    client.send_hit('event', event_category='User_auth', event_action='Signup')


@celery.task(time_limit=10, ignore_result=True)
def ga_auth_login(user_id, ip=None, ua=None, al=None, cid=None, language=''):
    ga = getattr(settings, f'GA_ANALYTICS_{language.upper()}')
    if not ga:
        return
    client = HitClient(ga, ip, ua, al, cid, 'Authenticated')
    client.send_hit('event', event_category='User_auth', event_action='Login')


@celery.task(time_limit=1800, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def delete_user(user_id):
    try:
        user = get_user_model().objects.only('id').get(id=user_id)
        user.delete()
    except get_user_model().DoesNotExist:
        return


@celery.task(time_limit=10)
def update_user_socials(user_id, vk_accounts=None):
    if vk_accounts:
        vk_ids = set(vk_accounts)
        account_uids = set(
            SocialAccount.objects.filter(user_id=user_id, provider='vk', uid__in=vk_ids).values_list('uid', flat=True)
        )
        to_delete = account_uids - vk_ids
        to_create = vk_ids - account_uids
        if to_delete:
            SocialAccount.objects.filter(user_id=user_id, provider='vk', uid__in=to_delete).delete()
        if to_create:
            for vk_id in to_create:
                try:
                    SocialAccount.objects.create(user_id=user_id, provider='vk', uid=vk_id)
                except IntegrityError:
                    pass
    user = get_user_model().objects.filter(id=user_id).prefetch_related('emailaddress_set').first()
    if user and user.email and not user.emailaddress_set.exists():
        EmailAddress.objects.create(user=user, email=user.email, verified=user.is_confirmed, primary=True)
