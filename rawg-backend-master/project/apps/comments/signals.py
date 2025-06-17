from django import dispatch
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.comments.models import (
    CommentCollectionFeed, CommentDiscussion, CommentReview, LikeCollectionFeed, LikeDiscussion, LikeReview,
)
from apps.comments.tasks import (
    update_attached, update_comment, update_comments_totals, update_last, update_likes_totals,
)
from apps.users.tasks import update_user_statistics

attach_last_comments = (CommentCollectionFeed,)
attach_comments = (CommentReview, CommentDiscussion)
attach_like_comments = (LikeReview, LikeDiscussion)

comment_object_fields_updated = dispatch.Signal(providing_args=['pk', 'fields_was', 'fields'])


@receiver(post_save, sender=CommentReview)
@receiver(post_save, sender=CommentCollectionFeed)
@receiver(post_save, sender=CommentDiscussion)
def comment_post_save(sender, instance, created, **kwargs):
    def on_commit():
        if instance.language_text_changed() or created:
            update_comment.delay(instance.id, instance._meta.model_name, sender in attach_comments,
                                 sender in attach_last_comments, sender.__name__)
        if created:
            update_comments_totals.delay(instance.id, instance.parent_id, instance.object_id, sender.__name__)
            update_user_statistics.delay(instance.user_id, ['comment'])
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=CommentReview)
@receiver(post_delete, sender=CommentCollectionFeed)
@receiver(post_delete, sender=CommentDiscussion)
def comment_post_delete(sender, instance, **kwargs):
    pk = instance.id

    def on_commit():
        update_comments_totals.delay(pk, instance.parent_id, instance.object_id, sender.__name__)
        if sender in attach_comments and not instance.parent_id:
            update_attached.delay(pk, instance.object_id, sender.__name__)
        if sender in attach_last_comments and not instance.parent_id:
            update_last.delay(instance.id, instance.object_id, sender.__name__)
        update_user_statistics.delay(instance.user_id, ['comment'])
    transaction.on_commit(on_commit)


@receiver(post_save, sender=LikeReview)
@receiver(post_save, sender=LikeCollectionFeed)
@receiver(post_save, sender=LikeDiscussion)
def like_post_save(sender, instance, created, **kwargs):
    def on_commit():
        update_likes_totals.delay(instance.comment_id, sender.__name__)
        if sender in attach_like_comments:
            update_attached.delay(instance.comment_id, None, sender.__name__, True)
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=LikeReview)
@receiver(post_delete, sender=LikeCollectionFeed)
@receiver(post_delete, sender=LikeDiscussion)
def like_post_delete(sender, instance, **kwargs):
    def on_commit():
        update_likes_totals.delay(instance.comment_id, sender.__name__)
        if sender in attach_like_comments:
            update_attached.delay(instance.comment_id, None, sender.__name__, True)
    transaction.on_commit(on_commit)
