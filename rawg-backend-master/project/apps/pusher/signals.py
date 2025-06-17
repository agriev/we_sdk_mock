from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.pusher.models import Notification


@receiver(post_save, sender=Notification)
def notification_post_save(sender, instance, created, **kwargs):
    if created:
        transaction.on_commit(lambda: instance.send())
