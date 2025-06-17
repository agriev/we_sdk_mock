from django.contrib import admin

from apps.mocks import models


@admin.register(models.Sync)
class SyncAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'action')
    list_display_links = list_display
    raw_id_fields = ('user',)


@admin.register(models.Feed)
class FeedAdmin(admin.ModelAdmin):
    list_display = ('id', 'target_user', 'action')
    list_display_links = list_display
    raw_id_fields = ('target_user', 'game')


@admin.register(models.Token)
class TokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'action')
    list_display_links = list_display
    raw_id_fields = ('user',)
