from django.apps import AppConfig


class FeedConfig(AppConfig):
    name = 'apps.feed'
    verbose_name = 'Feed'

    def ready(self):
        import apps.feed.signals  # noqa:F401
