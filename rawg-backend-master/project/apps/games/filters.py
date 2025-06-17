from django.contrib.admin import SimpleListFilter
from django.db.models import Count, Q
from django.utils.translation import gettext_lazy as _

from apps.payments.models import Payment


class PlayableGamesListFilter(SimpleListFilter):
    title = _('is playable')
    parameter_name = 'is_playable'

    def lookups(self, request, model_admin):
        return (
            ('true', _('да')),
            ('false', _('нет'))
        )

    def queryset(self, request, queryset):
        if self.value() == 'true':
            return queryset.filter(can_play=True).exclude(iframe='')
        if self.value() == 'false':
            return queryset.filter(Q(can_play=False) | Q(iframe=''))


class PaymentSystemSetupListFilter(SimpleListFilter):
    title = _('payment system configured')
    parameter_name = 'payment_configured'

    def lookups(self, request, model_admin):
        return (
            ('true', _('да')),
            ('false', _('нет'))
        )

    def queryset(self, request, queryset):
        amount_payment_projects = len(Payment.PAYMENT_SYSTEMS)
        queryset = queryset.annotate(amount_payment_projects=Count('paymentproject'))
        if self.value() == 'true':
            return queryset.filter(amount_payment_projects=amount_payment_projects)
        if self.value() == 'false':
            return queryset.exclude(amount_payment_projects=amount_payment_projects)
