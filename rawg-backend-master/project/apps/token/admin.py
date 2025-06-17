from django.contrib import admin

from apps.token import models
from apps.utils.admin import CompareVersionAdmin


class CycleStageInline(admin.TabularInline):
    model = models.CycleStage
    extra = 0


@admin.register(models.Cycle)
class CycleAdmin(admin.ModelAdmin):
    list_display = ('id', 'start', 'end', 'achievements', 'percent', 'status')
    list_display_links = list_display
    inlines = (CycleStageInline,)
    readonly_fields = ('finished', 'achievements', 'percent', 'status', 'data')

    def get_readonly_fields(self, request, obj=None):
        data = super().get_readonly_fields(request, obj)
        if obj:
            return ['start', 'end'] + list(data)
        return data


@admin.register(models.CycleUser)
class CycleUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'cycle', 'user', 'karma', 'achievements', 'position')
    list_display_links = list_display
    raw_id_fields = ('user', 'cycle')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(models.CycleKarma)
class CycleKarmaAdmin(admin.ModelAdmin):
    list_display = ('id', 'cycle', 'user', 'karma', 'parent_achievement')
    list_display_links = list_display
    raw_id_fields = ('user', 'cycle', 'parent_achievement')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(models.GameStatus)
class GameStatusAdmin(CompareVersionAdmin):
    list_display = ('id', 'cycle', 'game', 'status')
    list_display_links = list_display
    raw_id_fields = ('game', 'cycle')

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return ['game', 'cycle', 'status']
        return super().get_readonly_fields(request, obj)


@admin.register(models.Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'created', 'count', 'operation', 'type')
    list_display_links = list_display
    raw_id_fields = ('user',)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(models.Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'cycle', 'created')
    list_display_links = list_display
    raw_id_fields = ('user', 'cycle')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
