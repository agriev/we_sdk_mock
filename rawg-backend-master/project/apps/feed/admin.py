from django.contrib import admin
from rangefilter.filter import DateRangeFilter

from apps.feed import models
from apps.utils.adminsortable2 import SortableAdminMixin


@admin.register(models.Feed)
class FeedAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'action', 'created', 'data', 'language', 'queue')
    list_display_links = list_display
    list_filter = ('action', 'language', ('created', DateRangeFilter))
    raw_id_fields = ('user',)
    search_fields = ('id', 'user__username', 'user__email', 'action')


@admin.register(models.UserFeed)
class UserFeedAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'feed_id', 'sources', 'created', 'new')
    list_display_links = list_display
    raw_id_fields = ('user', 'feed')


@admin.register(models.UserNotifyFeed)
class UserNotifyFeedAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'feed_id', 'created', 'new')
    list_display_links = list_display
    raw_id_fields = ('user', 'feed')


@admin.register(models.FeedQueue)
class FeedQueueAdmin(admin.ModelAdmin):
    list_display = ('id', 'action', 'content_type', 'object_id', 'data', 'status', 'created', 'duration')
    list_display_links = list_display
    list_filter = ('status', 'action', ('created', DateRangeFilter))
    search_fields = ('id', 'object_id')


@admin.register(models.FeedElement)
class FeedElementAdmin(admin.ModelAdmin):
    list_display = ('id', 'action', 'content_type', 'object_id', 'data', 'created')
    list_display_links = list_display
    list_filter = ('action', ('created', DateRangeFilter))
    search_fields = ('id', 'object_id')


@admin.register(models.Reaction)
class ReactionAdmin(SortableAdminMixin, admin.ModelAdmin):
    list_display = ('id', 'name', 'slug')
    list_display_links = list_display


@admin.register(models.UserReaction)
class UserReactionAdmin(SortableAdminMixin, admin.ModelAdmin):
    list_display = ('id', 'user', 'feed', 'reaction')
    list_display_links = list_display
    raw_id_fields = ('user', 'feed')
