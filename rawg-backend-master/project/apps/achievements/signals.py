from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from apps.achievements import models
from apps.games.tasks import update_game_totals
# from apps.token.models import CycleKarma
# from apps.token.tasks import achievements_to_active_cycle
from apps.utils.tasks import detect_language
from apps.utils.unchangeable import unchangeable_pre_save

# @receiver(post_save, sender=models.Achievement)
# def achievement_post_save(sender, instance, created, **kwargs):
#     if not created and instance.is_init_was_changed('parent_id', False):
#         transaction.on_commit(lambda: achievements_to_active_cycle.delay(
#             'parent_achievement',
#             parent_achievement_id=instance.initial_parent_id,
#             add=False,
#         ))
#         transaction.on_commit(lambda: achievements_to_active_cycle.delay(
#             'parent_achievement',
#             parent_achievement_id=instance.parent_id,
#         ))


@receiver(post_save, sender=models.ParentAchievement)
def parent_achievement_post_save(sender, instance, created, **kwargs):
    def on_commit():
        if instance.language_text_changed() or created:
            detect_language.delay(
                instance.id, instance._meta.app_label, instance._meta.model_name,
            )
        if created:
            update_game_totals.delay(instance.game_id, 'achievements')
    transaction.on_commit(on_commit)
    # if created:
    #     transaction.on_commit(lambda: update_game_totals.delay(instance.game_id, 'achievements'))
    # elif instance.is_init_was_changed('game_id', False) or (
    #     instance.is_init_was_changed('percent', False)
    #     # don't run if the percent is in the old threshold
    #     and CycleKarma.get_type(instance.get_init_field('percent')) != CycleKarma.get_type(instance.percent)
    # ):
    # # run karma recalculating for all cycle karma records with this parent achievement for the current cycle
    # is_process = getattr(instance, 'is_process', None)
    # method = achievements_to_active_cycle.apply if is_process else achievements_to_active_cycle.apply_async
    # transaction.on_commit(lambda: method(
    #     args=('parent_achievement',),
    #     kwargs={'parent_achievement_id': instance.id},
    # ))


@receiver(post_delete, sender=models.ParentAchievement)
def parent_achievement_post_delete(instance, **kwargs):
    transaction.on_commit(lambda: update_game_totals.delay(instance.game_id, 'achievements'))


# @receiver(post_save, sender=models.UserAchievement)
# def user_achievement_post_save(sender, instance, created, **kwargs):
#     def on_commit():
#         if created or instance.is_init_was_changed('achieved', created):
#             achievements_to_active_cycle.delay(
#                 'user_achievement',
#                 parent_achievement_id=instance.achievement.parent_id,
#                 user_id=instance.user_id,
#                 achieved=instance.achieved,
#                 network_id=instance.achievement.network_id,
#             )
#     transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.UserAchievement)
def user_achievement_post_delete(instance, **kwargs):
    # parent_id = instance.achievement.parent_id
    # network_id = instance.achievement.network_id
    game_id = instance.achievement.parent.game_id

    def on_commit():
        instance.recalculate(game_id=game_id)
        # achievements_to_active_cycle.delay(
        #     'user_achievement',
        #     parent_achievement_id=parent_id,
        #     user_id=instance.user_id,
        #     network_id=network_id,
        #     add=False,
        # )
    transaction.on_commit(on_commit)


pre_save.connect(unchangeable_pre_save, models.UserAchievement)
