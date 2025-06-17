from allauth.socialaccount.adapter import get_adapter
from allauth.socialaccount.signals import social_account_added
from django import dispatch
from django.contrib.auth import get_user_model, user_logged_in
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.common.cache import CommonContentType
from apps.games.models import Collection
from apps.games.tasks import update_collection, update_game
from apps.recommendations.models import UserRecommendationQueue
from apps.recommendations.tasks import update_user_recommendations
from apps.stat.tasks import add_recommended_game_adding
from apps.users import models, tasks
from apps.users.models import AnonymousPlayer, AuthenticatedPlayer, Balance
from apps.utils.game_session import PlayerGameSessionController

user_fields_updated = dispatch.Signal(providing_args=['pk', 'fields_was', 'fields'])


def user_game_post_save_base(instances=None, instance=None, created=False, from_import=False, referer=None):
    if instance:
        instances = [instance]
    user_id = None
    because_you_completed = None
    for instance in instances:
        update_playtime = (
            (created and instance.playtime)
            or instance.playtime != getattr(instance, 'initial_playtime', 0)
        )
        update_game.delay(instance.game_id, update_playtime)
        if instance.status == models.UserGame.STATUS_BEATEN:
            because_you_completed = instance.game_id
        user_id = instance.user_id
        # when a user adds the game into his library hide the game from user recommendations and add into statistics
        add_recommended_game_adding.delay(user_id, instance.game_id, instance.status, from_import, referer)
    if user_id:
        # update user's statistics
        tasks.update_user_statistics.delay(user_id, ['game', 'review'])
        # update user's platforms
        tasks.save_user_platforms.delay(user_id)
        # update user recommendations
        update_user_recommendations.delay(user_id)
    # update the "because you completed" api
    if because_you_completed:
        tasks.because_you_completed.delay(instance.user_id, because_you_completed)


@receiver(post_save, sender=models.UserGame)
def user_game_post_save(sender, instance, created, **kwargs):
    def on_commit():
        user_game_post_save_base(instance=instance, created=created, referer=getattr(instance, '_referer', None))
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.UserGame)
def user_game_post_delete(instance, **kwargs):
    def on_commit():
        update_game.delay(instance.game_id)
        tasks.update_user_statistics.delay(instance.user_id, ['game', 'review'])
    transaction.on_commit(on_commit)


@receiver(post_save, sender=models.UserFollowElement)
def user_follow_post_save(sender, instance, created, **kwargs):
    def on_commit():
        if instance.content_type_id == CommonContentType().get(get_user_model()).id:
            tasks.update_user_followers.delay(instance.user_id)
            tasks.update_user_followers.delay(instance.object_id)
        if created:
            if instance.content_type_id == CommonContentType().get(Collection).id:
                update_collection.delay(instance.object_id)
            if instance.content_type_id != CommonContentType().get(get_user_model()).id:
                update_user_recommendations.delay(instance.user_id, UserRecommendationQueue.TARGETS_META)
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.UserFollowElement)
def user_follow_post_delete(instance, **kwargs):
    def on_commit():
        if instance.content_type_id == CommonContentType().get(get_user_model()).id:
            tasks.update_user_followers.delay(instance.user_id)
            tasks.update_user_followers.delay(instance.object_id)
        if instance.content_type_id == CommonContentType().get(Collection).id:
            update_collection.delay(instance.object_id)
    transaction.on_commit(on_commit)


@receiver(social_account_added)
def user_social_account_added(request, sociallogin, **kwargs):
    get_adapter(request).friends(sociallogin)


@receiver(post_save, sender=models.User)
def user_post_save(sender, instance, created, **kwargs):
    if created:
        tasks.ga_auth_signup.delay(
            instance.id,
            getattr(instance, 'ip', None),
            getattr(instance, 'ua', None),
            getattr(instance, 'al', None),
            getattr(instance, 'cid', None),
            getattr(instance, 'source_language', None),
        )
    tasks.update_user_socials.delay(instance.id, getattr(instance, '_vk_accounts', None))


@receiver(user_logged_in)
def user_logged_in(sender, request, user, **kwargs):
    PlayerGameSessionController().copy_between_players(
        source_player=AnonymousPlayer.from_request(request),
        destination_player=AuthenticatedPlayer(user),
        clear_source=True
    )


@receiver(post_save, sender=models.User)
def create_balance(instance, created, *args, **kwargs):
    if created:
        Balance.objects.create(user_id=instance.id)
