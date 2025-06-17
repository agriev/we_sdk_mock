from django.contrib import admin

from apps.feedback import models


@admin.register(models.Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'email', 'date', 'user', 'site')
    list_display_links = list_display
    readonly_fields = ('user', 'name', 'email', 'date', 'text', 'site')
