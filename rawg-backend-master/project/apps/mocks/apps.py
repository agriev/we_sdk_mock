from django.apps import AppConfig


class MocksConfig(AppConfig):
    name = 'apps.mocks'
    verbose_name = 'Mocks'

    def ready(self):
        import apps.mocks.signals  # noqa:F401
