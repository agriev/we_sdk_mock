from django.contrib import admin

from apps.comments import models


class CommentAdminMixin:
    list_display = ('id', 'user', 'object', 'parent', 'text', 'likes_count', 'comments_count', 'created')
    list_display_links = list_display
    raw_id_fields = ('user', 'parent', 'object')
    readonly_fields = ('language', 'language_detection')


class LikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'comment', 'added')
    list_display_links = list_display
    raw_id_fields = ('user', 'comment')


@admin.register(models.CommentReview)
class CommentReviewAdmin(CommentAdminMixin, admin.ModelAdmin):
    pass


@admin.register(models.CommentCollectionFeed)
class CommentCollectionFeedAdmin(CommentAdminMixin, admin.ModelAdmin):
    pass


@admin.register(models.CommentDiscussion)
class CommentDiscussionAdmin(CommentAdminMixin, admin.ModelAdmin):
    pass


@admin.register(models.LikeReview)
class LikeReviewAdmin(LikeAdmin):
    pass


@admin.register(models.LikeCollectionFeed)
class LikeCollectionFeedAdmin(LikeAdmin):
    pass


@admin.register(models.LikeDiscussion)
class LikeDiscussionAdmin(LikeAdmin):
    pass
