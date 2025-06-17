from django.apps import AppConfig


class CreditsConfig(AppConfig):
    name = 'apps.credits'
    verbose_name = 'Credits'

    def ready(self):
        import apps.credits.signals  # noqa:F401
