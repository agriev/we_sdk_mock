from django.apps import AppConfig


class AchievementsConfig(AppConfig):
    name = 'apps.achievements'
    verbose_name = 'Achievements'

    def ready(self):
        import apps.achievements.signals  # noqa:F401
