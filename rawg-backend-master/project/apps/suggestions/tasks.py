from apps.celery import app as celery


@celery.task(time_limit=60, bind=True, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_suggestion(self, suggestion_id):
    from apps.suggestions.models import Suggestion

    suggestion = Suggestion.objects.get(pk=suggestion_id)
    suggestion.set_statistics()
