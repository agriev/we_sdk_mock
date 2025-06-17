from django.db import IntegrityError
from django.db.models import F
from django.utils.timezone import now
from psycopg2 import errorcodes

from apps.celery import app as celery
from apps.recommendations.models import UserRecommendation
from apps.stat.models import (
    APIUserCounter, CarouselRating, RecommendationsVisit, RecommendedGameAdding, RecommendedGameStoreVisit,
    RecommendedGameVisit, Status, Story,
)
from apps.utils.celery import lock_transaction


@celery.task(time_limit=60, bind=True, ignore_result=True, max_retries=20, default_retry_delay=3)
def add_statuses(self, user_id, status):
    with lock_transaction('apps.stat.tasks.add_statuses.{}'.format(user_id), self.app.oid) as acquired:
        if not acquired:
            self.retry()
        if type(status) is list:
            statuses = []
            for stat in status:
                statuses.append(Status(user_id=user_id, status=stat, datetime=now()))
            Status.objects.bulk_create(statuses)
        else:
            Status.objects.create(user_id=user_id, status=status)


@celery.task(time_limit=30, ignore_result=True)
def add_carousel_rating(user_id, action, slug, rating, cid, ip, user_agent):
    CarouselRating.objects.create(
        user_id=user_id,
        action=action,
        slug=slug,
        rating=rating,
        cid=cid,
        ip=ip,
        user_agent=user_agent
    )


@celery.task(time_limit=40, ignore_result=True)
def add_story(cid, second, domain, ip, user_agent):
    Story.objects.create(
        cid=cid,
        second=second,
        domain=domain,
        ip=ip,
        user_agent=user_agent
    )


@celery.task(time_limit=20, ignore_result=True)
def add_recommendations_visit(user_id):
    RecommendationsVisit.objects.create(user_id=user_id)


@celery.task(time_limit=20, ignore_result=True)
def add_recommended_game_visit(user_id, game_id, referer=None):
    user_recommendation = UserRecommendation.objects.visible().only('id', 'sources').filter(
        user_id=user_id, game_id=game_id
    ).first()
    if not user_recommendation:
        return
    RecommendedGameVisit.objects.create(
        user_id=user_id, game_id=game_id, sources=user_recommendation.sources, referer=(referer or '')[:500],
    )


@celery.task(time_limit=20, ignore_result=True)
def add_recommended_game_adding(user_id, game_id, status, from_import=False, referer=None):
    user_recommendation = UserRecommendation.objects.visible().filter(
        user_id=user_id, game_id=game_id
    ).first()
    if not user_recommendation:
        return
    if not from_import:
        RecommendedGameAdding.objects.create(
            user_id=user_id, game_id=game_id, status=status, sources=user_recommendation.sources,
            referer=(referer or '')[:500]
        )
    user_recommendation.hidden = True
    user_recommendation.position = 0
    try:
        user_recommendation.save()
    except IntegrityError as e:
        # race condition
        if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
            raise


@celery.task(time_limit=20, ignore_result=True)
def add_recommended_game_store_visit(user_id, game_id, store_id):
    user_recommendation = UserRecommendation.objects.only('id', 'sources').filter(
        user_id=user_id, game_id=game_id
    ).first()
    if not user_recommendation:
        return
    RecommendedGameStoreVisit.objects.create(
        user_id=user_id, game_id=game_id, store_id=store_id,
        hidden=user_recommendation.hidden, sources=user_recommendation.sources
    )


@celery.task(time_limit=30, ignore_result=True)
def dump_api_stat(counters):
    for user_id, count in counters.items():
        try:
            counter, created = APIUserCounter.objects.get_or_create(user_id=user_id, date=now().date(), defaults={
                'count': count,
            })
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.FOREIGN_KEY_VIOLATION:
                raise
            continue
        if not created:
            counter.count = F('count') + count
            counter.save(update_fields=['count'])
