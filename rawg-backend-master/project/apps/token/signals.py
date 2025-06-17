from django import dispatch
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.utils.timezone import now

from apps.token.models import Cycle, CycleKarma, GameStatus, Transaction
from apps.token.tasks import achievements_to_active_cycle, notification, update_cycle_progress
from apps.utils.unchangeable import unchangeable_pre_save

user_joined = dispatch.Signal(providing_args=['instance'])
user_out = dispatch.Signal(providing_args=['instance'])


@receiver(user_joined)
def user_joined_receiver(sender, instance, signal=None, **kwargs):
    # add user achievements in active cycle
    transaction.on_commit(lambda: achievements_to_active_cycle.delay('user', user_id=instance.id))


@receiver(user_out)
def user_out_receiver(sender, instance, signal=None, **kwargs):
    # remove user achievements from active cycle
    transaction.on_commit(lambda: achievements_to_active_cycle.delay('user', user_id=instance.id, add=False))


@receiver(post_save, sender=Cycle)
def cycle_post_save(sender, instance, created, **kwargs):
    def on_commit():
        # add achievements to the active cycle if the cycle is running
        if instance.is_init_was_changed('status', created) and instance.status == Cycle.STATUS_ACTIVE and \
                instance.start < now():
            achievements_to_active_cycle.delay('all')
            notification.delay(instance.id)
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=CycleKarma)
def cycle_karma_post_delete(instance, **kwargs):
    transaction.on_commit(
        lambda: update_cycle_progress.delay(user_id=instance.user_id, cycle_id=instance.cycle_id, add=False)
    )


pre_save.connect(unchangeable_pre_save, GameStatus)


@receiver(post_save, sender=GameStatus)
def game_status_post_save(sender, instance, created, **kwargs):
    def on_commit():
        if created:
            achievements_to_active_cycle.delay('game_status', game_id=instance.game_id)
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=GameStatus)
def game_status_post_delete(instance, **kwargs):
    transaction.on_commit(lambda: achievements_to_active_cycle.delay('game_status', game_id=instance.game_id))


@receiver(post_save, sender=Transaction)
def update_user_tokens(sender, instance, created, **kwargs):
    if created:
        user = get_user_model().objects.select_for_update().get(id=instance.user_id)
        user.tokens += instance.count if instance.operation == 'in' else -instance.count
        user.save(update_fields=['tokens'])
