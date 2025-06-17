from django.conf import settings
from django.contrib import admin
from django.utils.safestring import mark_safe
from rangefilter.filter import DateRangeFilter

from apps.merger import actions, filters, models
from apps.utils.lang import get_site_by_current_language


@admin.register(models.StoreAdd)
class StoreAddAdmin(admin.ModelAdmin):
    list_display = ('id', 'game', 'date', 'stores_was_list', 'store_add')
    readonly_fields = ('game', 'stores_was', 'store_add')

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('stores_was')

    def stores_was_list(self, instance):
        return ', '.join([s.name for s in instance.stores_was.order_by('name')])


@admin.register(models.SimilarGame)
class SimilarGameAdmin(admin.ModelAdmin):
    list_display = ('id', 'game_1', 'game_2', 'is_ignored')
    readonly_fields = ('first_game', 'second_game')
    list_editable = ('is_ignored',)
    list_filter = (filters.SimilarGameFilter,)
    search_fields = ('first_game__name', 'second_game__name')
    actions = (actions.merge_games,)

    def get_queryset(self, request):
        return super().get_queryset(request) \
            .select_related('first_game', 'second_game') \
            .prefetch_related('first_game__stores', 'second_game__stores')

    def game_1(self, instance):
        data = '<a href="{}" target="_blank">{}</a> ({}) {} users {}'.format(
            '{}{}'.format(self.game_page, instance.first_game.slug),
            instance.first_game.name,
            ', '.join([s.name for s in instance.first_game.stores.all()]),
            instance.first_game.added, instance.first_game.released
        )
        return mark_safe(data)

    def game_2(self, instance):
        data = '<a href="{}" target="_blank">{}</a> ({}) {} users {}'.format(
            '{}{}'.format(self.game_page, instance.second_game.slug),
            instance.second_game.name,
            ', '.join([s.name for s in instance.second_game.stores.all()]),
            instance.second_game.added, instance.second_game.released
        )
        return mark_safe(data)

    @property
    def game_page(self):
        return '{}://{}/games/'.format(settings.SITE_PROTOCOL, get_site_by_current_language().name)


@admin.register(models.Network)
class NetworkAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'slug')
    readonly_fields = ('name',)

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(models.ImportLog)
class ImportLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'network', 'account', 'status', 'date', 'duration', 'is_sync')
    list_filter = ('network', 'status', 'is_sync', 'is_sync_old', ('date', DateRangeFilter))
    search_fields = ('user__email', 'user__username')


# @admin.register(models.Raptr)
# class RaptrAdmin(admin.ModelAdmin):
#     list_display = ('id', 'name', 'platform')
#     list_display_links = list_display


@admin.register(models.Import)
class ImportAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'is_sync', 'is_manual', 'is_old', 'is_started', 'retries', 'date')
    raw_id_fields = ('user',)


@admin.register(models.MergedSlug)
class MergedSlugAdmin(admin.ModelAdmin):
    list_display = ('id', 'old_slug', 'new_slug', 'content_type', 'manual')
    list_display_links = list_display
    list_filter = (filters.GameContentTypeFilter,)
    search_fields = ('id', 'old_slug', 'new_slug')

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(models.DeletedGame)
class DeletedGameAdmin(admin.ModelAdmin):
    list_display = ('id', 'game_name')
    list_display_links = list_display
    search_fields = ('id', 'game_name')
