import logging
import os
import signal

from celery import Celery
from celery.schedules import crontab
from celery.signals import task_failure, task_retry, task_revoked
from celery.task.base import Task
from celery.utils.log import get_logger
from celery.worker.request import Request
from django.conf import settings
from kombu import Queue

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')


class AppRequest(Request):
    def on_timeout(self, soft, timeout):
        if not soft:
            logging.getLogger('celery_failed').warning(
                f'{self.task.name} - {self._context.args} - {self._context.kwargs}'
            )
        Request.on_timeout(self, soft, timeout)  # super() doesn't work here


class AppTask(Task):
    Request = AppRequest

    def __call__(self, *args, **kwargs):
        # https://github.com/celery/celery/issues/2700#issuecomment-477147709
        signal.signal(
            signal.SIGTERM,
            lambda signum, frame: get_logger('celery.worker').info('SIGTERM received, wait till the task finished')
        )
        return Task.__call__(self, *args, **kwargs)  # super() doesn't work here


class AppCelery(Celery):
    task_cls = AppTask

    def on_configure(self):
        if settings.IS_SENTRY:
            import sentry_sdk
            from sentry_sdk.integrations.django import DjangoIntegration
            from sentry_sdk.integrations.celery import CeleryIntegration
            sentry_sdk.init(
                settings.SENTRY_DSN, integrations=[DjangoIntegration(), CeleryIntegration()], send_default_pii=True
            )


@task_retry.connect
def task_retry_handler(sender, signal, request, **kwargs):
    logging.getLogger('celery_retried').warning(f'{request.task} - {request.args} - {request.kwargs}')


@task_failure.connect
def task_failure_handler(sender, signal, **kwargs):
    logging.getLogger('celery_failed').warning(f'{sender.name} - {kwargs["args"]} - {kwargs["kwargs"]}')


@task_revoked.connect
def task_revoked_handler(sender, signal, request, **kwargs):
    logging.getLogger('celery_failed').warning(f'{request.task} - {request.args} - {request.kwargs}')


schedule = {
    # todo delete
    # 'external-load-main': {
    #     'task': 'apps.external.tasks.load_main',
    #     'schedule': crontab(minute=0, hour='*/6'),
    # },
    # 'external-load-main-twitch': {
    #     'task': 'apps.external.tasks.load_main',
    #     'schedule': crontab(minute='*/10'),
    #     'args': (True,),
    # },

    'pusher-clear': {
        'task': 'apps.pusher.tasks.clear',
        'schedule': crontab(minute=15, hour=0),
    },

    # 'token-update-progress': {
    #     'task': 'apps.token.tasks.update_progress',
    #     'schedule': crontab(minute='*/10'),
    # },
    # 'token-update-yesterday-position': {
    #     'task': 'apps.token.tasks.update_yesterday_position',
    #     'schedule': crontab(minute=0, hour=0),
    # },
}

if settings.FEED_PERIODICAL:
    schedule.update({
        'feed-game-is-released': {
            'task': 'apps.feed.tasks.game_is_released',
            'schedule': crontab(minute=0, hour=3),
        },
        'feed-popular-games': {
            'task': 'apps.feed.tasks.popular_games',
            'schedule': crontab(minute=5, hour=3, day_of_week=1),
        },
        'feed-offer-change-playing': {
            'task': 'apps.feed.tasks.offer_change_playing',
            'schedule': crontab(minute=10, hour=3, day_of_week=1),
        },
        'feed-offer-rate-game': {
            'task': 'apps.feed.tasks.offer_rate_game',
            'schedule': crontab(minute=15, hour=3, day_of_week=1),
        },
        'feed-most-rated-games': {
            'task': 'apps.feed.tasks.most_rated_games',
            'schedule': crontab(minute=10, hour=3, day_of_week=1),
        },
        'stripe-check-payments': {
            'task': 'apps.stripe.tasks.check_payments',
            'schedule': crontab(minute=0, hour='*/3'),
        },
    })

if settings.CHECK_NEW_SCREENSHOTS:
    schedule['games-check-new-screenshots'] = {
        'task': 'apps.games.tasks.check_new_screenshots',
        'schedule': crontab(minute='*/3'),
    }

if settings.MERGER_CHECK_TOKENS:
    schedule['merger-check-tokens'] = {
        'task': 'apps.merger.tasks.check_tokens',
        'schedule': crontab(minute='*/5'),
    }

if settings.WARM_CACHE:
    schedule['utils-warm-cache'] = {
        'task': 'apps.utils.tasks.warm_cache',
        'schedule': crontab(minute='*/10'),
    }

# # token program
# if os.environ.get('TOKEN_PROGRAM_BACKGROUND_TASKS'):
#     schedule['token-fast-achievements-fetching'] = {
#         'task': 'apps.token.tasks.fast_achievements_fetching',
#         'schedule': crontab(minute=0, hour='*/3'),
#     }
#     schedule['token-notification-reminders'] = {
#         'task': 'apps.token.tasks.notification_reminders',
#         'schedule': crontab(minute=5, hour=0),
#     }

app = AppCelery('ag')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
app.conf.beat_schedule = schedule
app.conf.task_default_queue = 'normal'
app.conf.task_queues = (
    Queue('critical'),
    Queue('high'),
    Queue('normal'),
    Queue('low'),
    Queue('denormalize'),
    Queue('stat'),
    Queue('video'),
)
app.conf.task_routes = {
    # critical
    'apps.utils.tasks.send_email': 'critical',
    'apps.utils.tasks.send_slack': 'critical',
    'apps.utils.tasks.get_versions_and_send_slack': 'critical',

    # high
    'apps.feed.tasks.*': 'high',
    'apps.merger.tasks.import_games': 'high',
    'apps.merger.tasks.check_tokens': 'high',
    'apps.merger.tasks.sync_user': 'high',
    'apps.merger.tasks.import_queue': 'high',
    'apps.users.tasks.feedback_propose': 'high',
    'apps.users.tasks.send_feedback_propose': 'high',
    'apps.users.tasks.delete_user': 'high',

    # low
    'apps.external.tasks.*': 'low',
    'apps.games.tasks.update_game_seo_fields': 'low',
    'apps.games.tasks.update_last_modified': 'low',
    'apps.games.tasks.add_game_feed_event': 'low',
    'apps.games.tasks.delete_game_feed_event': 'low',
    'apps.pusher.tasks.clear': 'low',
    'apps.token.tasks.*': 'low',
    'apps.utils.tasks.warm_cache': 'low',
    'apps.utils.tasks.clear_versions': 'low',
    'apps.utils.tasks.update_index_related': 'low',
    'apps.utils.tasks.HaystackSignalHandler': 'low',
    'cacheback.tasks.*': 'low',
    'celery_haystack.tasks.*': 'low',

    # denormalize
    # - rebuild_comments
    'apps.comments.tasks.update_comments_totals': 'denormalize',
    'apps.comments.tasks.update_likes_totals': 'denormalize',
    # - rebuild_persons
    'apps.credits.tasks.update_person': 'denormalize',
    # - rebuild_discussions
    'apps.discussions.tasks.update_discussions_totals': 'denormalize',
    # -
    'apps.files.tasks.update_games_counters': 'denormalize',
    # - rebuild_games_added, rebuild_games_counts, rebuild_games_items, rebuild_games_json
    'apps.games.tasks.update_game': 'denormalize',
    'apps.games.tasks.update_game_totals': 'denormalize',
    'apps.games.tasks.update_game_item': 'denormalize',
    'apps.games.tasks.update_game_json_field': 'denormalize',
    # - rebuild_collections
    'apps.games.tasks.update_collection': 'denormalize',
    'apps.games.tasks.update_likes_totals': 'denormalize',
    'apps.games.tasks.update_collection_feed': 'denormalize',
    # - rebuild_reviews, rebuild_versus
    'apps.reviews.tasks.*': 'denormalize',
    # - rebuild_suggestions
    'apps.suggestions.tasks.update_suggestion': 'denormalize',
    # - rebuild_users
    'apps.users.tasks.update_user_followers': 'denormalize',
    'apps.users.tasks.update_user_statistics': 'denormalize',

    # stat
    'apps.common.tasks.*': 'stat',
    'apps.merger.tasks.ga_import': 'stat',
    'apps.stat.tasks.*': 'stat',
    'apps.users.tasks.update_last_entered': 'stat',
    'apps.users.tasks.ga_auth_signup': 'stat',
    'apps.users.tasks.ga_auth_login': 'stat',

    # video and long tasks
    'apps.stories.tasks.*': 'video',
    'apps.merger.tasks.merge_items': 'video',
}
