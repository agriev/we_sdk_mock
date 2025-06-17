from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.discussions.models import Discussion
from apps.discussions.tasks import update_discussions_totals
from apps.feed.signals import MODELS_OPTIONS
from apps.utils.tasks import detect_language


@receiver(post_save, sender=Discussion)
def discussion_post_save(sender, instance, created, **kwargs):
    def on_commit():
        # update a game totals
        update_discussions_totals.delay(instance.game_id)
        # save a language
        if instance.language_text_changed() or created:
            detect_language.delay(instance.id, instance._meta.app_label, instance._meta.model_name,
                                  MODELS_OPTIONS[Discussion]['language'](instance))
            # update_last_modified.delay(instance.game_id)
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=Discussion)
def discussion_post_delete(instance, **kwargs):
    def on_commit():
        update_discussions_totals.delay(instance.game_id)
    transaction.on_commit(on_commit)
