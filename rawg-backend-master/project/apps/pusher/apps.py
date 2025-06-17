from django.apps import AppConfig


class PusherConfig(AppConfig):
    name = 'apps.pusher'
    verbose_name = 'Pusher'

    def ready(self):
        import apps.pusher.signals  # noqa:F401
