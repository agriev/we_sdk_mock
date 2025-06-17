from django.apps import AppConfig


class StatConfig(AppConfig):
    name = 'apps.stat'
    verbose_name = 'Statistic'

    def ready(self):
        import apps.stat.signals  # noqa:F401
