from django.contrib import admin

from apps.stripe import models


@admin.register(models.Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'api_group', 'subscription_id', 'invoice_id', 'created', 'until_date')
    list_display_links = list_display
    raw_id_fields = ('user',)
