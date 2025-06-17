from django.contrib.contenttypes.models import ContentType

from apps.utils.cache import Job


class CommonContentType(Job):
    lifetime = 60 * 60 * 24
    is_warm = False

    def get(self, model):
        return super().get(model._meta.app_label, model._meta.model_name)

    def fetch(self, app_label, model_name):
        return ContentType.objects.get_by_natural_key(app_label, model_name)
