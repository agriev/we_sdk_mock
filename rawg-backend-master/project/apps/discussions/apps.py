from django.apps import AppConfig


class DiscussionsConfig(AppConfig):
    name = 'apps.discussions'
    verbose_name = 'Discussions'

    def ready(self):
        import apps.discussions.signals  # noqa:F401
