from django.contrib import admin
from rangefilter.filter import DateRangeFilter

from apps.mailer import models


@admin.register(models.Mail)
class MailAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'user_email', 'mail_slug', 'sent_at', 'subject', 'source')
    list_display_links = list_display
    search_fields = ('user__username', 'user_email', 'mail_slug',)
    raw_id_fields = ('user',)
    list_filter = (('sent_at', DateRangeFilter), )

    def lookup_allowed(self, lookup, value):
        return lookup in ['user__source_language'] or super().lookup_allowed(lookup, value)


@admin.register(models.ViewedRecommendation)
class ViewedRecommendationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'game', 'created')
    list_display_links = list_display
    raw_id_fields = ('user', 'game')
