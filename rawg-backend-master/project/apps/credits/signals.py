from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.credits import models, tasks
from apps.games.tasks import update_game_totals


@receiver(post_save, sender=models.Person)
def person_post_save(sender, instance, created, **kwargs):
    def on_commit():
        if instance.is_init_was_changed(('hidden', 'name', 'display_name', 'gender'), created):
            tasks.update_person.delay(instance.id)
    transaction.on_commit(on_commit)


@receiver(post_save, sender=models.GamePerson)
def game_person_post_save(sender, instance, created, **kwargs):
    def on_commit():
        if instance.is_init_was_changed(('person_id', 'game_id', 'hidden'), created):
            if instance.initial_person_id:
                tasks.update_person.delay(instance.initial_person_id)
            if instance.person_id != instance.initial_person_id:
                tasks.update_person.delay(instance.person_id)
        if instance.is_init_was_changed(('game_id', 'hidden'), created):
            if instance.initial_game_id:
                update_game_totals.delay(instance.initial_game_id, 'persons')
            if instance.game_id != instance.initial_game_id:
                update_game_totals.delay(instance.game_id, 'persons')
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.GamePerson)
def game_person_post_delete(instance, **kwargs):
    def on_commit():
        tasks.update_person.delay(instance.person_id)
        update_game_totals.delay(instance.game_id, 'persons')
    transaction.on_commit(on_commit)
