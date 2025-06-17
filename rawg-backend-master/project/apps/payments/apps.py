from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    name = 'apps.payments'
    verbose_name = 'Payments'

    def ready(self):
        import apps.payments.signals  # noqa:F401
