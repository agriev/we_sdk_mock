from django.apps import AppConfig


class GamesConfig(AppConfig):
    SESSIONS_DATA_SIZE = 5 * 1024 * 1024
    PLAYED_HISTORY_SIZE = 5

    name = 'apps.games'
    verbose_name = 'Games'

    def ready(self):
        import apps.games.signals  # noqa:F401
