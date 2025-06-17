from django.conf import settings
from django.db import models
from django.utils.timezone import now

from apps.common.cache import CommonContentType
from apps.discussions.models import Discussion
from apps.games.models import CollectionFeed
from apps.reviews.models import Review
from apps.utils.models import LanguageModel


class CommentAbstract(LanguageModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    parent = models.ForeignKey(
        'self', models.CASCADE, related_name='children', null=True, blank=True, default=None, db_index=True
    )
    text = models.TextField(blank=False)
    created = models.DateTimeField(db_index=True)
    edited = models.DateTimeField()
    likes_count = models.PositiveIntegerField(default=0, db_index=True, editable=False)
    comments_count = models.PositiveIntegerField(default=0, editable=False)
    posts_count = models.PositiveIntegerField(default=0, editable=False)
    feed_elements = None
    feed_creator_field = None
    feed_related_elements = None
    feed_related_field = None
    skip_auto_now = False
    language_fields = ('text',)
    group_name = 'comment'

    def get_context(self, request):
        return self.get_many_context([self], request)

    def save(self, *args, **kwargs):
        if not self.skip_auto_now:
            if not self.id:
                self.created = now()
            self.edited = now()
        super().save(*args, **kwargs)

    @classmethod
    def get_many_context(cls, comments, request=None, posts=True):
        context = {}
        if comments and request and request.user.is_authenticated:
            comments = [comment.id if type(comment) is not int else comment for comment in comments]

            name = '{}_{}_users_likes'.format(cls._meta.app_label, cls._meta.model_name)
            context[name] = cls.likes.field.model.objects \
                .filter(comment_id__in=comments, user_id=request.user.id) \
                .values_list('comment_id', flat=True)

            if posts:
                kwargs = {
                    'content_type_id': CommonContentType().get(cls).id,
                    'object_id__in': comments,
                    'collection__creator_id': request.user.id,
                }
                name = '{}_{}_users_posts'.format(cls._meta.app_label, cls._meta.model_name)
                context[name] = CollectionFeed.objects.filter(**kwargs).values_list('object_id', flat=True)
        return context

    def __str__(self):
        return str(self.id)

    class Meta:
        abstract = True


class LikeAbstract(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    added = models.DateTimeField()
    skip_auto_now = False
    group_name = 'like'

    def save(self, *args, **kwargs):
        if not self.skip_auto_now and not self.id:
            self.added = now()
        super().save(*args, **kwargs)

    def __str__(self):
        return str(self.id)

    class Meta:
        abstract = True


class CommentReview(CommentAbstract):
    object = models.ForeignKey(Review, models.CASCADE, related_name='comments')
    feed_elements = 'reviews'
    feed_creator_field = 'user'
    feed_related_elements = {'games': 'game'}

    class Meta:
        verbose_name = 'Comment (Review)'
        verbose_name_plural = 'Comments (Review)'
        ordering = ('-created',)


class LikeReview(LikeAbstract):
    comment = models.ForeignKey(CommentReview, models.CASCADE, related_name='likes')

    class Meta:
        verbose_name = 'Like (Review)'
        verbose_name_plural = 'Likes (Review)'
        unique_together = ('user', 'comment')


class CommentCollectionFeed(CommentAbstract):
    object = models.ForeignKey(CollectionFeed, models.CASCADE, related_name='comments')
    feed_elements = 'collection_feeds'
    feed_creator_field = 'creator'
    feed_related_elements = {'collections': 'collection', 'games': ('content_object', 'game')}

    class Meta:
        verbose_name = 'Comment (Collection Feed)'
        verbose_name_plural = 'Comments (Collection Feed)'
        ordering = ('-created',)


class LikeCollectionFeed(LikeAbstract):
    comment = models.ForeignKey(CommentCollectionFeed, models.CASCADE, related_name='likes')

    class Meta:
        verbose_name = 'Like (Collection Feed)'
        verbose_name_plural = 'Likes (Collection Feed)'
        unique_together = ('user', 'comment')


class CommentDiscussion(CommentAbstract):
    object = models.ForeignKey(Discussion, models.CASCADE, related_name='comments')
    feed_elements = 'discussions'
    feed_creator_field = 'user'
    feed_related_elements = {'games': 'game'}

    class Meta:
        verbose_name = 'Comment (Discussion)'
        verbose_name_plural = 'Comments (Discussion)'
        ordering = ('-created',)


class LikeDiscussion(LikeAbstract):
    comment = models.ForeignKey(CommentDiscussion, models.CASCADE, related_name='likes')

    class Meta:
        verbose_name = 'Like (Discussion)'
        verbose_name_plural = 'Likes (Discussion)'
        unique_together = ('user', 'comment')
