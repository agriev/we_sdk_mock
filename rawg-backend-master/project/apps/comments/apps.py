from django.apps import AppConfig


class CommentsConfig(AppConfig):
    name = 'apps.comments'
    verbose_name = 'Comments'

    def ready(self):
        import apps.comments.signals  # noqa:F401
