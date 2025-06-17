import contextlib
import os
from datetime import timedelta
from math import ceil

import requests
import tweepy
from celery.exceptions import SoftTimeLimitExceeded
from celery_haystack.utils import enqueue_task
from django.apps import apps
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import IntegrityError, transaction
from django.db.models import Count, F
from django.utils.dateparse import parse_datetime as parse
from django.utils.timezone import now
from psycopg2 import errorcodes

from apps.celery import app as celery
from apps.common.cache import CommonContentType
from apps.games.models import Game
from apps.games.seo import get_last_modified, get_seo_fields
from apps.recommendations.models import ClassificationQueue
from apps.users.models import PlayerBase
from apps.utils.celery import lock
from apps.utils.game_session import PlayHistory
from apps.utils.storage import default_storage_chunks_save


@celery.task(soft_time_limit=60, bind=True, ignore_result=True, acks_late=True, reject_on_worker_lost=True,
             max_retries=5, default_retry_delay=20)
def update_game(self, game_id, update_playtime=False):
    from apps.games.models import Game
    from apps.games.signals import game_fields_updated
    from apps.users.models import UserGame

    try:
        added_qs = UserGame.objects.visible().filter(game_id=game_id)
        count = added_qs.count()
        users = {'added': {
            'count': count,
            'last': list(added_qs.order_by('-added').values_list('user_id', flat=True)[0:5])
        }}
        for status, _ in UserGame.STATUSES:
            qs = UserGame.objects.visible().filter(game_id=game_id, status=status)
            users[status] = {
                'count': qs.count(),
                'last': list(qs.order_by('-added').values_list('user_id', flat=True)[0:5])
            }
        kwargs = {
            'added': count,
            'added_by_status': dict(added_qs.values_list('status').annotate(count=Count('status')).order_by('-count')),
            'users': users,
        }
        if update_playtime:
            qs = UserGame.objects.filter(game_id=game_id, playtime__gt=0)
            try:
                playtime = qs.values_list('playtime', flat=True).order_by('playtime')[int(round(qs.count() / 2))]
            except IndexError:
                playtime = 0
            kwargs['playtime'] = ceil(playtime / 60 / 60)
        try:
            game = Game.objects.only('id', 'added').get(id=game_id)
        except Game.DoesNotExist:
            return
        Game.objects.filter(id=game_id).update(**kwargs)
        enqueue_task('update', game)
        game_fields_updated.send(
            sender=game.__class__, pk=game_id,
            fields_was={'added': game.added}, fields={'added': kwargs['added']}
        )
    except SoftTimeLimitExceeded:
        self.retry()


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_game_totals(game_id, target, run_index_update=True):
    from apps.achievements.models import Achievement
    from apps.credits.models import GamePerson
    from apps.games.models import Game

    try:
        game = Game.objects.only('id').get(id=game_id)
    except Game.DoesNotExist:
        return
    fields = {}
    if target in ('collections', None):
        counts = {}
        for lang, _ in settings.LANGUAGES:
            lang_iso3 = settings.LANGUAGES_2_TO_3[lang]
            counts[lang_iso3] = (
                game.collectiongame_set
                .exclude(collection__likes_users=0, collection__followers_count=0)
                .filter(collection__is_private=False, collection__language=lang_iso3)
                .count()
            )
        fields['collections_counts'] = counts
        fields['collections_count_all'] = (
            game.collectiongame_set
            .exclude(collection__likes_users=0, collection__followers_count=0)
            .filter(collection__is_private=False)
            .count()
        )
        # fields['updated'] = now()
    if target in ('screenshots', None):
        fields['screenshots_count'] = game.screenshots.filter(hidden=False).count()
        # fields['updated'] = now()
        try:
            ClassificationQueue.objects.get_or_create(game=game)
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
    if target in ('movies', None):
        fields['movies_count'] = game.movies.count()
    if target in ('linked', None):
        fields['parents_count'] = game.parent_games.count()
        fields['additions_count'] = game.additions.count()
        fields['game_series_count'] = game.game_series.count()
    if target in ('persons', None):
        fields['persons_count'] = (
            GamePerson.objects.visible().filter(game_id=game.id)
            .values_list('person_id').annotate(count=Count('id')).order_by('count').count()
        )
        # fields['updated'] = now()
    if target in ('achievements', None):
        fields['parent_achievements_count_all'] = game.parent_achievements.filter(hidden=False).count()
        counts = {}
        for lang, _ in settings.LANGUAGES:
            lang_iso3 = settings.LANGUAGES_2_TO_3[lang]
            counts[lang_iso3] = game.parent_achievements.filter(hidden=False, language=lang_iso3).count()
        fields['parent_achievements_counts'] = counts
        fields['achievements_count'] = Achievement.objects.filter(
            hidden=False,
            parent_id__in=list(game.parent_achievements.values_list('id', flat=True))
        ).count()
        # fields['updated'] = now()
    if fields:
        Game.objects.filter(id=game_id).update(**fields)
        if run_index_update:
            enqueue_task('update', game)


@celery.task(time_limit=300, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_game_item(app_label, model, ids=None, all_ids=False):
    model = apps.get_model(app_label=app_label, model_name=model)
    if ids:
        qs = model.objects.filter(id__in=ids)
    elif all_ids:
        qs = model.objects.all()
    else:
        return
    for obj in qs:
        obj.set_statistics()


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_game_json_field(game_id, field_name, run_index_update=True):
    from apps.games.models import Game
    from apps.stories.models import Clip
    from api.games import serializers
    from api.stories.serializers import ClipShortSerializer

    try:
        game = Game.objects.get(id=game_id)
    except Game.DoesNotExist:
        return
    update_dict = {}
    if not field_name or field_name == 'platforms':
        update_dict['platforms_json'] = serializers.GamePlatformSerializer(game.gameplatform_set, many=True).data
        platform_parents = {p.parent_id: p.parent for p in game.platforms.all() if p.parent}
        update_dict['parent_platforms_json'] = serializers.PlatformParentSerializer(
            sorted(list(platform_parents.values()), key=lambda x: x.order), many=True).data

    if not field_name or field_name == 'stores':
        update_dict['stores_json'] = serializers.GameStoreSerializer(game.gamestore_set, many=True).data

    if not field_name or field_name == 'developers':
        update_dict['developers_json'] = serializers.DeveloperSerializer(game.developers.visible(), many=True).data

    if not field_name or field_name == 'genres':
        update_dict['genres_json'] = serializers.GenreAllLanguagesSerializer(game.genres.visible(), many=True).data

    if not field_name or field_name == 'tags':
        update_dict['tags_json'] = serializers.TagSerializer(game.tags.visible(), many=True).data

    if not field_name or field_name == 'publishers':
        update_dict['publishers_json'] = serializers.PublisherSerializer(game.publishers.visible(), many=True).data

    if not field_name or field_name == 'screenshots':
        game_screenshots_list = serializers.ScreenShotShortSerializer(
            game.screenshots.visible()[0:6], many=True
        ).data
        if game.background_image:
            game_background_image = serializers.GameShortSerializer(game).data.get('background_image')
            for screenshot in game_screenshots_list:
                if screenshot['image'] == game_background_image:
                    del screenshot
            game_screenshots_list.insert(
                0,
                {'id': -1, 'image': game_background_image}
            )
        update_dict['screenshots_json'] = game_screenshots_list

    if not field_name or field_name == 'esrb_rating':
        update_dict['esrb_rating_json'] = None
        if game.esrb_rating:
            update_dict['esrb_rating_json'] = serializers.ESRBRatingAllLanguagesSerializer(game.esrb_rating).data

    if not field_name or field_name == 'clip':
        update_dict['clip_json'] = None
        clip = Clip.objects.filter(game_id=game.id).order_by('-id').first()
        if clip:
            update_dict['clip_json'] = ClipShortSerializer(clip).data

    Game.objects.filter(id=game_id).update(**update_dict)
    if run_index_update:
        enqueue_task('update', game)


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_game_seo_fields(game_id):
    from apps.games.models import Game

    try:
        game = Game.objects.only('id', 'game_seo_fields_json').get(id=game_id)
    except Game.DoesNotExist:
        return

    new_seo_fields = get_seo_fields(game)
    if game.game_seo_fields_json != new_seo_fields:
        Game.objects.filter(id=game_id).update(
            game_seo_fields_json=new_seo_fields,
            last_modified_json=get_last_modified(),
        )


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_last_modified(game_id, run_index_update=True):
    from apps.games.models import Game

    try:
        game = Game.objects.get(id=game_id)
    except Game.DoesNotExist:
        return
    Game.objects.filter(id=game_id).update(updated=now())
    if run_index_update:
        enqueue_task('update', game)


@celery.task(
    time_limit=30, bind=True, ignore_result=True, max_retries=3, default_retry_delay=35,
    acks_late=True, reject_on_worker_lost=True
)
def update_collection(self, collection_id, update_games=False):
    from apps.games.models import Collection, CollectionGame
    from apps.users.models import UserFollowElement

    with lock(f'apps.games.tasks.update_collection:{collection_id}', self.app.oid) as acquired:
        if not acquired:
            if self.request.retries == 1:
                return
            self.retry()
        try:
            collection = Collection.objects.get(id=collection_id)
        except Collection.DoesNotExist:
            return
        collection.backgrounds = collection.get_backgrounds()
        collection.games_count = collection.collectiongame_set.count()
        collection.followers_count = UserFollowElement.objects.filter(
            content_type_id=CommonContentType().get(Collection).id, object_id=collection_id
        ).count()
        collection.posts_count = collection.collectionfeed_set.exclude(
            content_type_id=CommonContentType().get(CollectionGame).id
        ).count()
        collection.save(update_fields=['backgrounds', 'games_count', 'posts_count', 'followers_count'])
        if update_games:
            for game_id in collection.collectiongame_set.values_list('game_id', flat=True):
                update_game_totals(game_id, 'collections')
            if collection.is_private:
                enqueue_task('delete', collection)


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_likes_totals(collection_id):
    from apps.games.models import Collection

    try:
        with transaction.atomic():
            collection = Collection.objects.select_for_update().only('id').get(id=collection_id)
            collection.likes_count = sum(collection.likes.values_list('count', flat=True))
            collection.likes_users = collection.likes.count()
            collection.likes_positive = collection.likes.count()  # todo outdated
            collection.likes_rating = collection.likes.count()  # todo outdated
            collection.save(update_fields=['likes_count', 'likes_users', 'likes_positive', 'likes_rating'])
    except Collection.DoesNotExist:
        pass


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_collection_feed(object_id, content_type, content_type_id):
    from apps.comments.models import CommentDiscussion, CommentReview
    from apps.discussions.models import Discussion
    from apps.games.models import CollectionFeed
    from apps.reviews.models import Review

    count = CollectionFeed.objects.filter(content_type_id=content_type_id, object_id=object_id).count()
    variants = {
        ('comments', 'commentdiscussion'): CommentDiscussion,
        ('comments', 'commentreview'): CommentReview,
        ('discussions', 'discussion'): Discussion,
        ('reviews', 'review'): Review,
    }

    try:
        with transaction.atomic():
            item = variants[tuple(content_type)].objects.only('id').get(id=object_id)
            item.posts_count = count
            item.save(update_fields=['posts_count'])
    except (KeyError, CommentDiscussion.DoesNotExist, CommentReview.DoesNotExist,
            Discussion.DoesNotExist, Review.DoesNotExist):
        pass


@celery.task(time_limit=120, ignore_result=True)
def post_screenshots_twitter(screenshots_ids, game_title, game_url):
    from apps.games.models import ScreenShot

    TWITTER_ACCESS_KEY = os.environ.get('TWITTER_ACCESS_KEY', '')
    TWITTER_ACCESS_SECRET = os.environ.get('TWITTER_ACCESS_SECRET', '')
    TWITTER_CONSUMER_SECRET = os.environ.get('TWITTER_CONSUMER_SECRET', '')
    TWITTER_CONSUMER_TOKEN = os.environ.get('TWITTER_CONSUMER_TOKEN', '')

    if not all([
        TWITTER_ACCESS_KEY, TWITTER_ACCESS_SECRET,
        TWITTER_CONSUMER_SECRET, TWITTER_CONSUMER_TOKEN
    ]):
        return

    auth = tweepy.OAuthHandler(consumer_key=TWITTER_CONSUMER_TOKEN, consumer_secret=TWITTER_CONSUMER_SECRET)
    auth.set_access_token(TWITTER_ACCESS_KEY, TWITTER_ACCESS_SECRET)

    api = tweepy.API(auth)

    media_ids = []
    screenshots_qs = ScreenShot.objects.visible().filter(id__in=screenshots_ids).order_by('-id')

    screenshots_dir = '/tmp/screens'
    os.makedirs(screenshots_dir, exist_ok=True)
    description = ''

    if screenshots_qs.count() < 4:
        description = f"A screenshot was added to {game_title} {game_url}"
        screenshots_qs = screenshots_qs[:1]

    elif screenshots_qs.count() >= 4:
        description = f"{screenshots_qs.count()} screenshots were added to {game_title} {game_url}"
        screenshots_qs = screenshots_qs[:4]

    for screenshot in screenshots_qs:
        filename = '{}/{}'.format(screenshots_dir, screenshot.visible_image.name.split('/')[-1])
        with open(filename, 'wb') as write:
            default_storage_chunks_save(screenshot.visible_image.name, write)
        media_upload = api.media_upload(filename=write.name)
        media_ids.append(media_upload.media_id)
        with contextlib.suppress(FileNotFoundError):
            os.remove(filename)

    if not media_ids:
        return

    api.update_status(status=description, media_ids=media_ids)


@celery.task(time_limit=120, ignore_result=True)
def post_screenshot_to_discord(screenshots_ids, game_title, game_url):
    from apps.games.models import ScreenShot

    DISCORD_HOOK = os.environ.get('DISCORD_HOOK', '')
    if not DISCORD_HOOK:
        return

    if len(screenshots_ids) == 1:
        description = f"A screenshot was added to {game_title} <{game_url}>"
    else:
        description = f"{len(screenshots_ids)} screenshots were added to {game_title} <{game_url}>"

    screenshots = ScreenShot.objects.filter(id__in=screenshots_ids)
    files = {}
    for i, screenshot in enumerate(screenshots):
        filefield = 'file{}'.format(i)
        files[filefield] = default_storage.open(screenshot.visible_image.name)

    requests.post(DISCORD_HOOK, files=files, data={'content': description})


@celery.task(time_limit=60, ignore_result=True, acks_late=True)
def check_new_screenshots():
    from apps.games.models import Game, ScreenShot, ScreenShotCount

    time_to_check = now() - timedelta(minutes=10)
    games_ids = ScreenShotCount.objects \
        .filter(queued__lte=now(), queued__gte=time_to_check) \
        .values_list('game_id', flat=True)

    if not games_ids:
        return

    for game_id in games_ids:
        screenshots = ScreenShot.objects \
            .filter(created__lte=now(), created__gte=time_to_check, game_id=game_id)

        if not screenshots:
            continue

        game_url = Game.objects.get(id=game_id).get_absolute_url()
        game_title = Game.objects.get(id=game_id).name
        eta = screenshots.last().created + timedelta(minutes=10)
        screenshots_ids = list(screenshots.values_list('id', flat=True))

        if settings.ENVIRONMENT == 'PRODUCTION':
            post_screenshots_twitter.apply_async(
                eta=eta,
                kwargs={
                    'screenshots_ids': screenshots_ids,
                    'game_title': game_title,
                    'game_url': game_url,
                }
            )
            post_screenshot_to_discord.apply_async(
                eta=eta,
                kwargs={
                    'screenshots_ids': screenshots_ids,
                    'game_title': game_title,
                    'game_url': game_url,
                }
            )

        # update_last_modified.delay(game_id=game_id)

        queued = ScreenShotCount.objects.get(game_id=game_id)
        queued.queued = None
        queued.save()


@celery.task(time_limit=10)
def touch_game_visit(game_id, player_id, expiry_date):
    try:
        uid = PlayerBase.validate_id(player_id)
    except PlayerBase.InvalidIdError:
        pass
    else:
        PlayHistory().add(game_id, uid, expiry_date and parse(expiry_date))


@celery.task(time_limit=10)
def increment_plays(game_id):
    Game.objects.playable().filter(id=game_id).update(plays=F('plays') + 1)
