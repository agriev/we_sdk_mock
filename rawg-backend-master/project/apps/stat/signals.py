from django.contrib.auth import get_user_model
from django.db.models import signals
from django.dispatch import receiver

from .models import Visit


@receiver(signals.post_save, sender=get_user_model())
def user_logged_in(instance, update_fields, created, **kwargs):
    if created or (update_fields and 'last_visit' in update_fields):
        Visit.objects.create(user_id=instance.id)
