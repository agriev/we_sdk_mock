from constance.signals import config_updated
from django.conf import settings
from django.dispatch import receiver

from apps.banners.cache import BannersMedium


@receiver(config_updated)
def constance_updated(sender, key, old_value, new_value, **kwargs):
    if key in settings.CONSTANCE_CONFIG_FIELDSETS['News']:
        BannersMedium().invalidate()
