from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.files import models
from apps.files.tasks import update_games_counters


@receiver(post_save, sender=models.CheatCode)
@receiver(post_save, sender=models.File)
def file_post_save(sender, instance, created, **kwargs):
    transaction.on_commit(lambda: update_games_counters.delay(instance.game_id))


@receiver(post_delete, sender=models.CheatCode)
@receiver(post_delete, sender=models.File)
def file_post_delete(instance, **kwargs):
    transaction.on_commit(lambda: update_games_counters.delay(instance.game_id))
