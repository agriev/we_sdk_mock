from hashlib import sha1

import dateutil
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.db.models import Sum
from django.db.models.signals import post_delete
from django.utils.timezone import now
from psycopg2 import errorcodes

from apps.achievements.models import ParentAchievement, UserAchievement
from apps.celery import app as celery
from apps.merger.tasks import check_syncs, sync_user
from apps.token import models
from apps.utils.tasks import send_email, send_slack


@celery.task(time_limit=600, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def achievements_to_active_cycle(action, user_id=None, parent_achievement_id=None, achieved=None, game_id=None,
                                 network_id=None, add=True):
    from apps.token.signals import cycle_karma_post_delete

    cycle = models.Cycle.objects.active_or_finishing()
    if not cycle:
        return
    if type(achieved) is str:
        achieved = dateutil.parser.parse(achieved)

    parent_achievements = []
    cycle_karma = []

    if action == 'all':
        kwargs = {'achieved__gte': cycle.start, 'achieved__lt': cycle.end, 'user__token_program': True}
        parent_achievements = get_parent_achievements(cycle, kwargs=kwargs)

    elif action == 'user':
        try:
            user = get_user_model().objects.get(id=user_id)
        except get_user_model().DoesNotExist:
            return
        kwargs = {'achieved__gte': cycle.start, 'achieved__lt': cycle.end, 'user_id': user_id}
        parent_achievements = get_parent_achievements(cycle, kwargs=kwargs, one_user=user)
        if not add:
            # delete the cycle user record if it has no karma
            models.CycleUser.objects.filter(user_id=user_id, cycle=cycle, karma=0).delete()

    elif action == 'user_achievement':
        try:
            user = get_user_model().objects.get(id=user_id)
            parent_achievement = ParentAchievement.objects.get(id=parent_achievement_id)
        except (get_user_model().DoesNotExist, ParentAchievement.DoesNotExist):
            return
        parent_achievements = get_parent_achievements(cycle, data=[(user, parent_achievement, achieved, network_id)])

    elif action == 'parent_achievement':
        cycle_karma = models.CycleKarma.objects \
            .filter(parent_achievement_id=parent_achievement_id, cycle=cycle) \
            .prefetch_related('parent_achievement')

    elif action == 'game_status':
        cycle_karma = models.CycleKarma.objects \
            .filter(parent_achievement__game_id=game_id, cycle=cycle) \
            .prefetch_related('parent_achievement')

    game_statuses = {}

    # disable the cycle karma post delete signal and run once manually
    post_delete.disconnect(cycle_karma_post_delete, models.CycleKarma)

    users_add = set()
    users_delete = set()

    for user_id, parent, achieved, delete in parent_achievements:
        kwargs = {'user_id': user_id, 'parent_achievement_id': parent.id, 'cycle': cycle}
        if add and not delete:
            delete, user_id = calculate_karma(parent, game_statuses, cycle, kwargs=kwargs, achieved=achieved)
            if user_id:
                users_add.add(user_id)
        if (not add or delete) and models.CycleKarma.objects.filter(**kwargs).count():
            models.CycleKarma.objects.filter(**kwargs).delete()
            users_delete.add(user_id)

    for karma in cycle_karma:
        delete = False
        if add:
            delete, user_id = calculate_karma(karma.parent_achievement, game_statuses, cycle, karma)
            if user_id:
                users_add.add(user_id)
        if not add or delete:
            karma.delete()
            users_delete.add(karma.user_id)

    for user_id in users_add:
        update_cycle_progress(user_id=user_id, cycle_id=cycle.id)
    for user_id in users_delete:
        update_cycle_progress(user_id=user_id, cycle_id=cycle.id, add=False)

    post_delete.connect(cycle_karma_post_delete, models.CycleKarma)


def get_parent_achievements(cycle, kwargs=None, data=None, one_user=None):
    if kwargs:
        data = [
            (one_user if one_user else ua.user, ua.achievement.parent, ua.achieved, ua.achievement.network_id)
            for ua in UserAchievement.objects.filter(**kwargs)
        ]
    result = []
    for user, parent, achieved, network_id in data:
        result.append((
            user.id,
            parent,
            achieved,
            not user.is_network_confirmed(network_id) or not cycle.date_in_cycle(achieved)
        ))
    return result


def calculate_karma(parent, game_statuses, cycle, cycle_karma=None, kwargs=None, achieved=None):
    if not parent.game_id:
        return True, False
    if not game_statuses.get(parent.game_id):
        game_statuses[parent.game_id] = models.CycleKarma.get_statuses(parent.game_id, cycle.id)
    karma = models.CycleKarma.get_karma(parent.percent, game_statuses[parent.game_id])
    if karma:
        updated = False
        if kwargs:
            kwargs['defaults'] = {'karma': karma, 'achieved': achieved}
            cycle_karma, created = models.CycleKarma.objects.get_or_create(**kwargs)
            if not created:
                update_fields = []
                if cycle_karma.karma != karma:
                    cycle_karma.karma = karma
                    update_fields.append('karma')
                if cycle_karma.achieved < achieved:
                    cycle_karma.achieved = achieved
                    update_fields.append('achieved')
                if update_fields:
                    cycle_karma.save(update_fields=update_fields)
                    updated = cycle_karma.user_id
            else:
                updated = cycle_karma.user_id
        else:
            if cycle_karma.karma != karma:
                cycle_karma.karma = karma
                cycle_karma.save(update_fields=['karma'])
                updated = cycle_karma.user_id
        return False, updated
    return True, False


@celery.task(time_limit=600, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_cycle_progress(user_id=None, cycle_id=None, add=True):
    try:
        cycle = models.Cycle.objects.get(id=cycle_id)
    except models.Cycle.DoesNotExist:
        return

    try:
        cycle_user, _ = models.CycleUser.objects.get_or_create(user_id=user_id, cycle=cycle)
    except IntegrityError as e:
        if e.__cause__.pgcode != errorcodes.FOREIGN_KEY_VIOLATION:
            raise
        cycle_user = None
    if cycle_user:
        cycle_user.achievements = models.CycleKarma.objects.filter(
            user_id=user_id,
            cycle=cycle
        ).count()
        cycle_user.achievements_gold = models.CycleKarma.objects.filter(
            user_id=user_id,
            parent_achievement__percent__gt=0,
            parent_achievement__percent__lt=models.CycleKarma.THRESHOLDS[0],
            cycle=cycle,
        ).count()
        cycle_user.achievements_silver = models.CycleKarma.objects.filter(
            user_id=user_id,
            parent_achievement__percent__gte=models.CycleKarma.THRESHOLDS[0],
            parent_achievement__percent__lt=models.CycleKarma.THRESHOLDS[1],
            cycle=cycle,
        ).count()
        cycle_user.achievements_bronze = models.CycleKarma.objects.filter(
            user_id=user_id,
            parent_achievement__percent__gte=models.CycleKarma.THRESHOLDS[1],
            cycle=cycle,
        ).count()
        cycle_user.karma = models.CycleKarma.objects.filter(
            user_id=user_id,
            cycle=cycle
        ).aggregate(sum=Sum('karma'))['sum'] or 0
        qs = get_user_model().objects.values_list('token_program', flat=True)
        if not cycle_user.karma and not qs.get(id=user_id):
            cycle_user.delete()
        else:
            cycle_user.save()

    cycle.update_active()


@celery.task(time_limit=30, ignore_result=True)
def update_progress():
    cycle = models.Cycle.objects.finishing()
    if cycle and cycle.data and check_syncs(cycle.data):
        cycle.update_active(set_failure=True)

    cycle = models.Cycle.objects.active()
    if cycle:
        cycle.update_active(set_finishing=True)
    else:
        cycle = models.Cycle.objects.current()
        if cycle:
            cycle.update_next()


@celery.task(time_limit=600, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_progress_finishing():
    cycle = models.Cycle.objects.finishing()
    if not cycle:
        return
    cycle.data = fast_achievements_fetching()
    if not cycle.data:
        cycle.update_active(set_failure=True)
        return
    cycle.save(update_fields=['data'])


@celery.task(time_limit=120, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def fast_achievements_fetching():
    cycle = models.Cycle.objects.active()
    if not cycle:
        return

    results = []
    for user_id in get_user_model().objects.filter(token_program=True).values_list('id', flat=True):
        pk = sync_user(user_id, is_fast=2)
        if pk:
            results.append(pk)
    return results


@celery.task(time_limit=600, ignore_result=True)
def update_yesterday_position():
    cycle = models.Cycle.objects.active()
    if not cycle:
        return

    cycle_users = models.CycleUser.objects.filter(cycle=cycle)

    for i, cycle_user in enumerate(cycle_users, start=1):
        cycle_user.position_yesterday = i
        cycle_user.save(update_fields=['position_yesterday'])


@celery.task(time_limit=600, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def notification(pk):
    cycle = models.Cycle.objects.get(id=pk)
    if not cycle:
        return

    if cycle.status == models.Cycle.STATUS_ACTIVE:
        slack_text = 'The cycle is started'
        for email, user_id in models.Subscription.objects.values_list('user__email', 'user_id'):
            context = {
                'user_id': user_id,
                'security_hash': sha1('{}.{}'.format(email, settings.SECRET_KEY).encode('utf-8')).hexdigest(),
                'mail_slug': 'cycle_is_started',
                'email': email,
            }
            send_email.delay('token/email/cycle_is_started', context, [email])

    elif cycle.status == models.Cycle.STATUS_FAILURE:
        slack_text = 'The cycle is failed'
        subscribed_users_data = (
            models.CycleUser
            .objects
            .filter(cycle_id=pk, user__subscribe_mail_token=True)
            .values_list('user__email', 'user_id')
        )

        for email, user_id in subscribed_users_data:
            context = {
                'user_id': user_id,
                'security_hash': sha1('{}.{}'.format(email, settings.SECRET_KEY).encode('utf-8')).hexdigest(),
                'mail_slug': 'cycle_is_failed',
                'email': email,
            }
            send_email.delay('token/email/cycle_is_failed', context, [email])

    else:
        slack_text = 'The cycle is finished'
        subscribed_users_data = (
            models.CycleUser
            .objects
            .filter(cycle_id=pk, user__subscribe_mail_token=True)
            .values_list('user__email', 'user_id')
        )

        for email, user_id in subscribed_users_data:
            context = {
                'user_id': user_id,
                'security_hash': sha1('{}.{}'.format(email, settings.SECRET_KEY).encode('utf-8')).hexdigest(),
                'mail_slug': 'cycle_is_finished',
                'email': email,
            }
            send_email.delay('token/email/cycle_is_finished', context, [email])

    send_slack.delay(slack_text, 'Token Reward Program', ':moneybag:', '#notifs-tokens', True)


@celery.task(time_limit=600, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def notification_reminders():
    cycle = models.Cycle.objects.current()
    if not cycle or cycle.status not in (models.Cycle.STATUS_SUCCESS, models.Cycle.STATUS_COMPLETED):
        return
    if (now() - cycle.end).days == 5:
        unexchanged_karma_users_data = (
            models.CycleUser
            .objects
            .filter(cycle_id=cycle.id, karma_is_exchanged=False, karma__gt=0, user__subscribe_mail_token=True)
            .values_list('user__email', 'user_id')
        )

        for email, user_id in unexchanged_karma_users_data:
            context = {
                'user_id': user_id,
                'security_hash': sha1('{}.{}'.format(email, settings.SECRET_KEY).encode('utf-8')).hexdigest(),
                'mail_slug': 'exchange_karma',
                'email': email,
            }
            send_email.delay('token/email/exchange_karma', context, [email])
