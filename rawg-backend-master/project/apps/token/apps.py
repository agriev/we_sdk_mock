from django.apps import AppConfig


class TokenConfig(AppConfig):
    name = 'apps.token'
    verbose_name = 'Token'

    def ready(self):
        import apps.token.signals  # noqa:F401
