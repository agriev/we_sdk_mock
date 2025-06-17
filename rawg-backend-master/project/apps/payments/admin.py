import csv
import json

from django.contrib import admin, messages
from django.http import HttpResponse
from django.urls import reverse
from django.utils.safestring import mark_safe

from apps.utils.payments import BasePaymentSystem, PaymentSyncResultMap, SynchronizerType, UkassaPaymentSynchronizer, \
    UkassaRefundSynchronizer
from .filters import PaymentSystemNameListFilter
from .models import LLPConfig, Payment, PaymentEvent


class PaymentEventInline(admin.TabularInline):
    model = PaymentEvent
    readonly_fields = ('data_', 'created', '_event_type')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def data_(self, instance: PaymentEvent):
        return json.dumps(instance.data, ensure_ascii=False)
    data_.short_description = 'data'


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'game', 'player', 'current_state', 'created', 'payment_system_name', 'purchase_amount',
                    'discount_')
    readonly_fields = ('id', 'current_state', 'last_success_event', 'game_', 'player', 'discount_')
    list_filter = ('current_state', PaymentSystemNameListFilter)
    search_fields = ('game__name', 'player__username')
    inlines = (PaymentEventInline,)
    ordering = ('-id',)

    actions = ('sync_ukassa_payment', 'sync_ukassa_refund', 'sync_xsolla_payment', 'sync_xsolla_refund')

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).client_data_annotated().annotate_discount()

    def purchase_amount(self, obj):
        if obj.data:
            return ' '.join(map(lambda x: str(x), BasePaymentSystem.purchase_amount(obj.data).values()))
        return 'data not found'
    purchase_amount.short_description = 'purchase amount'

    def game_(self, instance: Payment):
        path = reverse('admin:games_game_change', kwargs={'object_id': instance.game_id})
        name = instance.game.name
        return mark_safe(f'<a href="{path}">{name}</a>')
    game_.short_description = 'game'

    def discount_(self, obj):
        return obj.discount
    discount_.short_description = 'discount'

    # Xsolla Manager can resend the webhook, this is the preferred method of synchronization

    # def sync_xsolla_payment(self, request, queryset) -> HttpResponse:
    #     queryset = queryset.exclude_initial()
    #     syncer = XsollaPaymentSynchronizer()
    #     results = BasePaymentSystem.sync_many(queryset, syncer)
    #     return self._sync_results_response(syncer, results)
    #
    # def sync_xsolla_refund(self, request, queryset) -> HttpResponse:
    #     queryset = queryset.exclude_initial()
    #     syncer = XsollaRefundSynchronizer()
    #     results = BasePaymentSystem.sync_many(queryset, syncer)
    #     return self._sync_results_response(syncer, results)

    def sync_ukassa_payment(self, request, queryset) -> HttpResponse:
        queryset = queryset.exclude_initial()
        syncer = UkassaPaymentSynchronizer()
        results = BasePaymentSystem.sync_many(queryset, syncer)
        return self._sync_results_response(syncer, results)

    def sync_ukassa_refund(self, request, queryset) -> HttpResponse:
        queryset = queryset.exclude_initial()
        syncer = UkassaRefundSynchronizer()
        results = BasePaymentSystem.sync_many(queryset, syncer)
        return self._sync_results_response(syncer, results)

    def _sync_results_response(self, syncer: SynchronizerType, results: PaymentSyncResultMap) -> HttpResponse:
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename=sync_results_{syncer.name}.csv'
        csv_writer = csv.writer(response, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        csv_writer.writerow(['id', 'updated', 'error'])
        for payment, result in results.items():
            csv_writer.writerow([payment.id, *result])
        return response


@admin.register(LLPConfig)
class LLPConfigAdmin(admin.ModelAdmin):
    list_display = ('id', 'active', 'full_duration', 'stage_duration', 'lives', 'hot_streak_factor',
                    'serial_hot_streak', 'weekly_logins_hot_streak', 'bonus_per_day')

    actions = ['set_as_active']

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def set_as_active(self, request, queryset):
        try:
            instance = queryset.get()
        except LLPConfig.MultipleObjectsReturned:
            self.message_user(request, 'select only 1 object', messages.ERROR)
        else:
            if instance.active:
                self.message_user(request, 'the selected object is already active', messages.WARNING)
            else:
                instance.active = True
                instance.save()
                self.message_user(
                    request, 'the new active config will be used for new loyalty programs', messages.INFO
                )

    def save_model(self, request, obj, form, change):
        ret = super().save_model(request, obj, form, change)
        if obj.active:
            self.message_user(request, 'the new active config will be used for new loyalty programs', messages.INFO)
        return ret
