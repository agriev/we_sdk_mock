from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("game", "amount", "currency", "status", "created")
    list_filter = ("status", "currency")
    search_fields = ("transaction_id",) 