from django.apps import AppConfig


class SuggestionsConfig(AppConfig):
    name = 'apps.suggestions'
    verbose_name = 'Suggestions'

    def ready(self):
        import apps.suggestions.signals  # noqa:F401
