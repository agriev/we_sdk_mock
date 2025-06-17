from django import dispatch
from django.db import transaction
from django.db.models.signals import m2m_changed, post_delete, post_save
from django.dispatch import receiver

from apps.reviews.models import Like, Review
from apps.reviews.tasks import update_likes_totals, update_review, update_reviews_totals
from apps.users.tasks import update_user_statistics

review_fields_updated = dispatch.Signal(providing_args=['pk', 'fields_was', 'fields'])


@receiver(post_save, sender=Review)
def review_post_save(sender, instance, created, **kwargs):
    def on_commit():
        is_update_versus = False
        if created and not instance.hidden:
            if instance.is_text:
                is_update_versus = True
                # update_last_modified.delay(instance.game_id)
            # update a game rating
            if instance.user_id:
                update_reviews_totals.delay(instance.game_id, ratings=True)
        if not created and instance.user_id:
            initial_hidden = getattr(instance, 'initial_hidden', None)
            is_deleted = instance.hidden and initial_hidden is False
            is_restored = not instance.hidden and initial_hidden is True
            rating_was = getattr(instance, 'initial_rating', None)
            if is_deleted:
                is_update_versus = True
                # update a game rating
                update_reviews_totals.delay(instance.game_id, ratings=True)
            else:
                if rating_was and rating_was != instance.rating:
                    is_update_versus = True
                    # update a game rating
                    update_reviews_totals.delay(instance.game_id, ratings=True)
                if not instance.is_text:
                    is_update_versus = True
                elif is_restored:
                    is_update_versus = True
        # update a user statistic
        if instance.user_id:
            update_user_statistics.delay(instance.user_id, ['review'])
        # update a review
        update_review.delay(instance.id, instance.is_text and (instance.language_text_changed() or created),
                            instance.is_init_was_changed('likes_fake', created), is_update_versus)
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=Review)
def review_post_delete(instance, **kwargs):
    def on_commit():
        if instance.user_id:
            update_user_statistics.delay(instance.user_id, ['review'])
        update_reviews_totals.delay(instance.game_id, ratings=True)
    transaction.on_commit(on_commit)


@receiver(m2m_changed, sender=Review.reactions.through)
def review_reactions_changed(sender, instance, action, **kwargs):
    if action in ('post_add', 'post_remove', 'post_clear'):
        update_reviews_totals.delay(instance.game_id, reactions=True)


@receiver(post_save, sender=Like)
def like_post_save(sender, instance, created, **kwargs):
    transaction.on_commit(lambda: update_likes_totals.delay(instance.review_id))


@receiver(post_delete, sender=Like)
def like_post_delete(instance, **kwargs):
    transaction.on_commit(lambda: update_likes_totals.delay(instance.review_id))
