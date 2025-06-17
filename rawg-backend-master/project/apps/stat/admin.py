from django.contrib import admin
from rangefilter.filter import DateRangeFilter

from apps.stat import models


@admin.register(models.Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'datetime')
    list_display_links = list_display
    raw_id_fields = ('user',)


@admin.register(models.Status)
class StatusAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'datetime')
    list_display_links = list_display
    raw_id_fields = ('user',)


@admin.register(models.CarouselRating)
class CarouselRatingAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'cid', 'ip', 'action', 'slug', 'rating', 'datetime', 'user_agent')
    list_display_links = list_display
    raw_id_fields = ('user',)
    readonly_fields = ('user', 'cid', 'ip', 'action', 'slug', 'rating', 'datetime', 'user_agent')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(models.Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'cid', 'second', 'domain', 'ip', 'user_agent', 'datetime')
    list_display_links = list_display
    readonly_fields = ('cid', 'second', 'domain', 'ip', 'user_agent', 'datetime')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(models.RecommendationsVisit)
class RecommendationsVisitAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'datetime')
    list_display_links = list_display
    raw_id_fields = ('user',)


@admin.register(models.RecommendedGameVisit)
class RecommendedGameVisitAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'game', 'sources', 'datetime', 'referer')
    list_display_links = list_display
    raw_id_fields = ('user', 'game')


@admin.register(models.RecommendedGameAdding)
class RecommendedGameAddingAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'game', 'status', 'sources', 'datetime', 'referer')
    list_display_links = list_display
    raw_id_fields = ('user', 'game')


@admin.register(models.RecommendedGameStoreVisit)
class RecommendedGameStoreVisitAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'game', 'store', 'sources', 'hidden', 'datetime')
    list_display_links = list_display
    raw_id_fields = ('user', 'game')


@admin.register(models.APIByUserAgentVisit)
class APIByUserAgentVisitAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_agent', 'date', 'count')
    list_display_links = list_display
    search_fields = ('user_agent',)
    readonly_fields = ('user_agent', 'date', 'count')


@admin.register(models.APIByIPVisit)
class APIByIPVisitAdmin(admin.ModelAdmin):
    list_display = ('id', 'ip', 'date', 'count')
    list_display_links = list_display
    search_fields = ('ip',)
    readonly_fields = ('ip', 'date', 'count')


@admin.register(models.APIByIPAndUserAgentVisit)
class APIByIPAndUserAgentVisitAdmin(admin.ModelAdmin):
    list_display = ('id', 'ip', 'user_agent', 'date', 'count')
    list_display_links = list_display
    search_fields = ('ip', 'user_agent')
    readonly_fields = ('ip', 'user_agent', 'date', 'count')


@admin.register(models.APIByUserVisit)
class APIByUserVisitAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'date', 'count')
    list_display_links = list_display
    search_fields = ('user_id',)
    readonly_fields = ('user_id', 'date', 'count')


@admin.register(models.APIUserCounter)
class APIUserCounterAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_id', 'user_info', 'date', 'count')
    list_display_links = ('id', 'user_id', 'date', 'count')
    search_fields = ('user_id',)
    readonly_fields = ('user_id', 'date', 'count')
    list_filter = (('date', DateRangeFilter), )

    def user_info(self, instance):
        return f'{instance.user.api_email} / {instance.user.api_url}'
