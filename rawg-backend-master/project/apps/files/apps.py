from django.apps import AppConfig


class FilesConfig(AppConfig):
    name = 'apps.files'
    verbose_name = 'Files'

    def ready(self):
        import apps.files.signals  # noqa:F401
