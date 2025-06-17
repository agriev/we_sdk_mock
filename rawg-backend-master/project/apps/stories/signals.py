from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.games.tasks import update_game_json_field
from apps.stories import models
from apps.stories.tasks import make_clip


@receiver(post_save, sender=models.GameStory)
def game_story_post_save(sender, instance, created, **kwargs):
    def on_commit():
        if instance.is_init_was_changed(['game_id', 'youtube_link'], created) and (created or instance.clip_id):
            models.GameStory.objects.filter(id=instance.id).update(clip=None)
            make_clip.delay(instance.id, instance.game_id)
        else:
            instance.story.check_ready()
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.GameStory)
def game_story__post_delete(instance, **kwargs):
    def on_commit():
        instance.story.check_ready()
    transaction.on_commit(on_commit)


@receiver(post_save, sender=models.Story)
def story_post_save(sender, instance, created, **kwargs):
    def on_commit():
        if created:
            instance.top()
        instance.check_ready()
    transaction.on_commit(on_commit)


@receiver(post_save, sender=models.Clip)
def clip_post_save(sender, instance, created, **kwargs):
    def on_commit():
        update_game_json_field.delay(instance.game_id, 'clip')
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.Clip)
def clip_post_delete(instance, **kwargs):
    def on_commit():
        update_game_json_field.delay(instance.game_id, 'clip')
    transaction.on_commit(on_commit)
