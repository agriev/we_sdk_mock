from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.suggestions.models import Suggestion, SuggestionFilters
from apps.suggestions.tasks import update_suggestion


@receiver(post_save, sender=SuggestionFilters)
def suggestion_filters_post_save(sender, instance, created, **kwargs):
    def on_commit():
        update_suggestion.delay(instance.suggestion_id)

    transaction.on_commit(on_commit)


@receiver(post_save, sender=Suggestion)
def suggestion_post_save(sender, instance, created, **kwargs):
    def on_commit():
        update_suggestion.delay(instance.id)
    transaction.on_commit(on_commit)
