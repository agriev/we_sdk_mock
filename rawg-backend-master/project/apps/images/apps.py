from django.apps import AppConfig


class ImagesConfig(AppConfig):
    name = 'apps.images'
    verbose_name = 'Images'

    def ready(self):
        import apps.images.signals  # noqa:F401
