from django.db import transaction
from django.db.models import Count
from django.utils.timezone import now

from apps.celery import app as celery
from apps.common.cache import CommonContentType
from apps.feed import feed
from apps.feed.models import Feed, FeedElement, UserReaction
from apps.games.models import Game
from apps.users.models import UserGame


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_feed_fields(feed_id):
    try:
        f = Feed.objects.get(id=feed_id)
    except Feed.DoesNotExist:
        return
    qs = UserReaction.objects.filter(feed_id=feed_id).values('reaction').annotate(count=Count('id')) \
        .order_by('reaction__order').values_list('reaction', 'reaction__slug', 'reaction__name', 'count')
    f.reactions = []
    for pk, slug, name, count in qs:
        f.reactions.append({
            'id': pk,
            'slug': slug,
            'name': name,
            'count': count,
        })
    f.save(update_fields=['reactions'])


@celery.task(time_limit=600, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def game_is_released():
    for game in Game.objects.only('id').filter(released=now()):
        kwargs = {
            'content_type': CommonContentType().get(game),
            'object_id': game.id,
            'action': Feed.ACTIONS_GAME_IS_RELEASED,
        }
        if FeedElement.objects.filter(**kwargs).count():
            continue
        user_games = UserGame.objects.visible().filter(game_id=game.id, status=UserGame.STATUS_TOPLAY).only('user_id')
        if not user_games.count():
            continue
        with transaction.atomic():
            FeedElement.objects.get_or_create(**kwargs, defaults={
                'created': now(),
                'data': {'users': list(user_games.values_list('user_id', flat=True))}
            })


@celery.task(time_limit=1200, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def offer_change_playing():
    feed.offer_change_playing()


@celery.task(time_limit=600, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def offer_rate_game():
    feed.offer_rate_game()


@celery.task(time_limit=600, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def popular_games():
    feed.popular_games()


@celery.task(time_limit=600, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def most_rated_games():
    feed.most_rated_games()


@celery.task(time_limit=120, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def delete_from_feed(**kwargs):
    Feed.objects.filter(**kwargs).delete()
