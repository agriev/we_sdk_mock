from datetime import date, datetime, timedelta

from django import dispatch
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import QuerySet
from django.db.models.fields.files import FieldFile, ImageFieldFile
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.forms import model_to_dict
from django.utils.timezone import now

from apps.comments import models as comments_models
from apps.comments.signals import comment_object_fields_updated
from apps.common.cache import CommonContentType
from apps.discussions import models as discussions_models
from apps.feed import feed, tasks
from apps.feed.models import Feed, FeedElement, FeedQueue, UserFeed, UserNotifyFeed, UserReaction
from apps.games import models as games_models
from apps.games.signals import game_fields_updated
from apps.reviews import models as reviews_models
from apps.reviews.signals import review_fields_updated
from apps.users import models as users_models
from apps.users.signals import user_fields_updated


@receiver(post_save, sender=Feed)
def feed_post_save(sender, instance, created, **kwargs):
    if instance.callback:
        # create a notify for a related user
        UserNotifyFeed.objects.create_user_notify_feed(instance.callback, instance)
    if created:
        # create events for following users
        UserFeed.objects.create_from_feed(instance)
    elif instance.new_element_was_saved or instance.new_element_was_deleted:
        # update events for following users
        UserFeed.objects.update_from_feed(instance)


@receiver(post_save, sender=FeedElement)
def feed_element_post_save(sender, instance, created, **kwargs):
    if created:
        if instance.action == Feed.ACTIONS_GAME_IS_RELEASED:
            feed.game_is_released(
                instance.content_object, instance.created, instance.data['users'],
                not getattr(instance, 'old', False)
            )
        elif instance.action == Feed.ACTIONS_MARK_GAME_COMMUNITY:
            feed.marked_game_community(
                instance.content_object, instance.created,
                not getattr(instance, 'old', False)
            )
        elif instance.action == Feed.ACTIONS_FOLLOW_USER_COMMUNITY:
            feed.follow_user_community(
                instance.content_object, instance.created,
                not getattr(instance, 'old', False)
            )
        elif instance.action == Feed.ACTIONS_ADD_REVIEW:
            feed.added_review_community(instance.object_id, not getattr(instance, 'old', False))
        elif instance.action == Feed.ACTIONS_ADD_DISCUSSION:
            feed.added_discussion_community(instance.object_id, not getattr(instance, 'old', False))


@receiver(post_save, sender=UserReaction)
def user_reaction_post_save(sender, instance, created, **kwargs):
    def on_commit():
        if created:
            tasks.update_feed_fields.delay(instance.feed_id)
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=UserReaction)
def user_reaction_post_delete(instance, **kwargs):
    transaction.on_commit(lambda: tasks.update_feed_fields.delay(instance.feed_id))


@receiver(game_fields_updated)
def game_fields_updated_receiver(sender, pk, fields_was, fields, **kwargs):
    count = Feed.MARK_GAME_COMMUNITY['count']
    if fields_was['added'] < count and fields['added'] >= count:
        days = Feed.MARK_GAME_COMMUNITY['days']
        created = now()
        return community(
            pk,
            games_models.Game,
            Feed.ACTIONS_MARK_GAME_COMMUNITY,
            created,
            users_models.UserGame.objects.visible().filter(
                game_id=pk,
                created__gte=created - timedelta(days=days),
                created__lte=created
            ),
            Feed.MARK_GAME_COMMUNITY['count'],
        )


@receiver(user_fields_updated)
def user_fields_updated_receiver(sender, pk, fields_was, fields, **kwargs):
    count = Feed.FOLLOW_USER_COMMUNITY['count']
    if fields_was['followers_count'] < count and fields['followers_count'] >= count:
        days = Feed.FOLLOW_USER_COMMUNITY['days']
        created = now()
        return community(
            pk,
            get_user_model(),
            Feed.ACTIONS_FOLLOW_USER_COMMUNITY,
            created,
            users_models.UserFollowElement.objects.filter(
                object_id=pk,
                added__gte=created - timedelta(days=days),
                added__lte=created,
                content_type=CommonContentType().get(get_user_model()),
            ),
            Feed.FOLLOW_USER_COMMUNITY['count'],
        )


@receiver(review_fields_updated)
def review_fields_updated_receiver(sender, pk, fields_was, fields, **kwargs):
    count = Feed.REVIEWS_DISCUSSIONS_COMMUNITY['likes']
    if fields_was['likes_positive'] < count and fields['likes_positive'] >= count:
        return community(
            pk,
            get_user_model(),
            Feed.ACTIONS_ADD_REVIEW,
            now(),
        )


@receiver(comment_object_fields_updated, sender=discussions_models.Discussion)
@receiver(comment_object_fields_updated, sender=reviews_models.Review)
def comment_object_fields_updated_receiver(sender, pk, fields_was, fields, **kwargs):
    count = Feed.REVIEWS_DISCUSSIONS_COMMUNITY['comments']
    if fields_was['comments_count'] < count and fields['comments_count'] >= count:
        return community(
            pk,
            sender,
            Feed.ACTIONS_ADD_REVIEW if sender is reviews_models.Review else Feed.ACTIONS_ADD_DISCUSSION,
            now(),
        )


def community(object_id, model_class, action, created, users_qs=None, count=None):
    kwargs = {
        'content_type': CommonContentType().get(model_class),
        'object_id': object_id,
        'action': action,
    }
    qs = FeedElement.objects.filter(**kwargs)
    if qs.count():
        return True
    if users_qs and count and users_qs.count() < count:
        return False
    with transaction.atomic():
        FeedElement.objects.get_or_create(**kwargs, defaults={'created': created})
    return True


MODELS_CREATED = (
    comments_models.CommentReview, comments_models.CommentDiscussion, comments_models.CommentCollectionFeed,
    comments_models.LikeReview, comments_models.LikeDiscussion, comments_models.LikeCollectionFeed,
    discussions_models.Discussion,
    games_models.Collection, games_models.CollectionGame, games_models.CollectionFeed, games_models.CollectionOffer,
    games_models.CollectionLike,
    reviews_models.Review,
    users_models.UserFollowElement, users_models.UserGame,
)
MODELS_DELETED = (
    comments_models.CommentReview, comments_models.CommentDiscussion, comments_models.CommentCollectionFeed,
    comments_models.LikeReview, comments_models.LikeDiscussion, comments_models.LikeCollectionFeed,
    discussions_models.Discussion,
    games_models.Game,
    games_models.Collection, games_models.CollectionGame, games_models.CollectionFeed, games_models.CollectionOffer,
    games_models.CollectionLike,
    reviews_models.Review,
    users_models.User,
    users_models.UserFollowElement, users_models.UserGame,
)
MODELS_OPTIONS = {
    discussions_models.Discussion: {
        'language': lambda ins: {
            'action': Feed.ACTIONS_ADD_DISCUSSION,
            'data__discussions__contains': ins.id,
        },
    },
    games_models.Collection: {
        'created': False,
        'instance': {
            'initial_games_count': 0,
        },
        'language': lambda ins: {
            'action': Feed.ACTIONS_CREATE_COLLECTION,
            'data__collections__contains': ins.id,
        },
        'qs': games_models.Collection.objects.exclude(games_count__lt=Feed.MIN_GAMES_FOR_FEED)
    },
    games_models.CollectionFeed: {
        'language': lambda ins: {
            'action': Feed.ACTIONS_ADD_FEED_TO_COLLECTION,
            'data__collection_feeds__contains': ins.id,
        },
        'qs': games_models.CollectionFeed.objects.exclude(text_bare='', text_attachments=0)
    },
    reviews_models.Review: {
        'language': lambda ins: {
            'action': Feed.ACTIONS_ADD_REVIEW,
            'data__reviews__contains': ins.id,
        },
        'qs': reviews_models.Review.objects.filter(is_text=True)
    },
    users_models.UserGame: {
        'qs': users_models.UserGame.objects.filter(status__in=Feed.GAME_STATUSES)
    }
}

instance_saved = dispatch.Signal(providing_args=['instance', 'created', 'old'])
instance_deleted = dispatch.Signal(providing_args=['instance', 'pk', 'old'])
language_detected = dispatch.Signal(providing_args=['instance', 'old'])


def get_feed_customs(sender, instance, action, created, old, kwargs):
    if sender is games_models.Collection:
        if created:
            created = False
        elif instance.is_init_was_changed('games_count', False):
            games_count_was = instance.initial_games_count
            if games_count_was < Feed.MIN_GAMES_FOR_FEED and instance.games_count >= Feed.MIN_GAMES_FOR_FEED:
                created = True
            if games_count_was >= Feed.MIN_GAMES_FOR_FEED and instance.games_count < Feed.MIN_GAMES_FOR_FEED:
                action = FeedQueue.DELETION
    elif sender is games_models.CollectionFeed:
        is_collection_game = instance.content_type.natural_key() == ('games', 'collectiongame')
        if is_collection_game:
            is_text_added = instance.is_init_was_changed('text_bare', created)
            is_attachments_added = instance.is_init_was_changed('text_attachments', created)
            was_text = instance.get_init_field('text_bare', False) or \
                instance.get_init_field('text_attachments', False)
            is_text = instance.text_bare or instance.text_attachments
            created = False
            # add
            if (is_text_added or is_attachments_added) and is_text:
                created = True
                if instance.content_object:
                    instance_deleted_receiver(games_models.CollectionGame, instance.content_object,
                                              instance.object_id, old)
            # delete
            if was_text and not is_text:
                action = FeedQueue.DELETION
    elif sender is games_models.CollectionLike:
        if not created and not instance.positive and instance.is_init_was_changed('positive', False):
            action = FeedQueue.DELETION
    elif sender is reviews_models.Review and instance.user_id:
        if created:
            tasks.delete_from_feed.delay(
                action=Feed.ACTIONS_OFFER_TO_RATE_GAME,
                data__games__contains=instance.game_id,
                data__users__contains=instance.user_id
            )
        if created and not instance.is_text:
            created = False
        if not created and instance.is_text and instance.is_init_was_changed('is_text', False):
            created = True
        if not created and not instance.is_text and instance.is_init_was_changed('is_text', False):
            action = FeedQueue.DELETION
    elif sender is users_models.UserGame:
        if created and instance.status not in Feed.GAME_STATUSES:
            created = False
        if not created and instance.is_init_was_changed('status', False):
            created = True
            kwargs['old_status'] = instance.initial_status
            if instance.initial_status == users_models.UserGame.STATUS_PLAYING:
                tasks.delete_from_feed.delay(
                    action=Feed.ACTIONS_OFFER_TO_CHANGE_PLAYING,
                    data__games__contains=instance.game_id,
                    data__users__contains=instance.user_id
                )
            if instance.initial_status == users_models.UserGame.STATUS_BEATEN:
                tasks.delete_from_feed.delay(
                    action=Feed.ACTIONS_OFFER_TO_RATE_GAME,
                    data__games__contains=instance.game_id,
                    data__users__contains=instance.user_id
                )
    return action, created, kwargs


def get_feed_customs_delete(sender, instance):
    if sender is users_models.UserGame:
        tasks.delete_from_feed.delay(
            action__in=[Feed.ACTIONS_OFFER_TO_CHANGE_PLAYING, Feed.ACTIONS_OFFER_TO_RATE_GAME],
            data__games__contains=instance.game_id,
            data__users__contains=instance.user_id
        )


def instance_receiver(sender, instance, action, pk, created=False, old=False, **kwargs):
    created_date = None

    if action != FeedQueue.DELETION:
        if getattr(instance, 'hidden', None) in (True, False):
            initial_hidden = getattr(instance, 'initial_hidden', None)
            if initial_hidden in (True, False):
                is_deleted = instance.hidden and initial_hidden is False
                is_restored = not instance.hidden and initial_hidden is True
                if is_deleted:
                    action = FeedQueue.DELETION
                elif is_restored:
                    created = True
                    action = FeedQueue.ADDITION
            if created and instance.hidden:
                created = False

    if action != FeedQueue.DELETION:
        action, created, kwargs = get_feed_customs(sender, instance, action, created, old, kwargs)
        created_date = getattr(instance, 'added', None) or getattr(instance, 'created')
    else:
        get_feed_customs_delete(sender, instance)

    if action == FeedQueue.DELETION:
        fields = model_to_dict(instance)
        for key, field in fields.items():
            if type(field) in (datetime, date):
                fields[key] = field.isoformat()
            elif type(field) in (QuerySet, FieldFile, ImageFieldFile):
                fields[key] = None
            elif type(field) is list:
                rows = []
                for f in field:
                    if type(f) not in (str, int) and getattr(f, 'id', None):
                        f = f.id
                    rows.append(f)
                fields[key] = rows
        fields['id'] = pk
        kwargs.update(fields)
    elif not created or getattr(instance, 'is_disable_feed', False):
        return

    FeedQueue.objects.create_queue(instance, pk, action, kwargs, created_date, old)


@receiver(instance_saved)
def instance_saved_receiver(sender, instance, created, old=False, signal=None, **kwargs):
    instance_receiver(sender, instance, FeedQueue.ADDITION, instance.id, created=created, old=old, **kwargs)


@receiver(instance_deleted)
def instance_deleted_receiver(sender, instance, pk, old=False, signal=None, **kwargs):
    instance_receiver(sender, instance, FeedQueue.DELETION, pk, old=old, **kwargs)


@receiver(language_detected)
def language_detected_receiver(sender, instance, old=False, signal=None, **kwargs):
    FeedQueue.objects.create_queue(instance, instance.id, FeedQueue.LANGUAGE, kwargs, old=old)


def model_post_save(sender, instance, raw, created, using, update_fields, **kwargs):
    transaction.on_commit(lambda: instance_saved_receiver(sender, instance, created, **kwargs))


def model_post_delete(sender, instance, using, **kwargs):
    pk = instance.id
    transaction.on_commit(lambda: instance_deleted_receiver(sender, instance, pk, **kwargs))


for model in MODELS_CREATED:
    post_save.connect(model_post_save, model)

for model in MODELS_DELETED:
    post_delete.connect(model_post_delete, model)
