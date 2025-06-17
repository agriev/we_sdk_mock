from django.utils.timezone import now

from apps.celery import app as celery
from apps.recommendations.models import UserRecommendationQueue


@celery.task(time_limit=10, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_user_recommendations(user_id, target=None):
    if not target:
        update_user_recommendations(user_id, UserRecommendationQueue.TARGETS_META)
        update_user_recommendations(user_id, UserRecommendationQueue.TARGETS_COLLABORATIVE)
        return
    try:
        UserRecommendationQueue.objects.get_or_create(user_id=user_id, target=target, defaults={'datetime': now()})
    except UserRecommendationQueue.MultipleObjectsReturned:
        pass
