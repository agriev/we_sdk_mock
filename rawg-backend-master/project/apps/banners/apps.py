from django.apps import AppConfig


class BannersConfig(AppConfig):
    name = 'apps.banners'
    verbose_name = 'Banners'

    def ready(self):
        import apps.banners.signals  # noqa:F401
