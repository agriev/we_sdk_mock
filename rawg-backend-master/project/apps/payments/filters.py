from django.contrib.admin import SimpleListFilter
from django.utils.translation import gettext_lazy as _

from apps.payments.models import Payment


class PaymentSystemNameListFilter(SimpleListFilter):
    title = _('payment system name')
    parameter_name = 'payment_system_name'

    def lookups(self, request, model_admin):
        return tuple((name[0], _(name[1])) for name in Payment.PAYMENT_SYSTEMS + (('', 'Not set'),))

    def queryset(self, request, queryset):
        if self.value() is not None:
            return queryset.filter(payment_system_name=self.value())
