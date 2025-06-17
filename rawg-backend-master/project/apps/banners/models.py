from django.db import models
from django_cache_dependencies import get_cache

from apps.utils.models import InitialValueMixin


class Banner(InitialValueMixin, models.Model):
    text = models.TextField(blank=True)
    url = models.URLField(blank=True, default='')
    url_text = models.TextField(blank=True, default='')
    created = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=False, db_index=True)

    init_fields = ('active',)

    def save(self, *args, **kwargs):
        if self.is_init_change('active', kwargs):
            get_cache().invalidate_tags('banners.active')
            if self.active:
                Banner.objects.update(active=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.text

    class Meta:
        ordering = ('-id',)
        verbose_name = 'Banner'
        verbose_name_plural = 'Banners'
