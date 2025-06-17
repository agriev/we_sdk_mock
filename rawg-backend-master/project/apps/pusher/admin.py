from django.contrib import admin

from apps.pusher import models


@admin.register(models.Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'action', 'data', 'confirmed', 'created', 'confirmation_date')
    list_display_links = list_display
    raw_id_fields = ('user',)
