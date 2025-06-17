from django.conf import settings
from django.contrib.sites.models import Site
from django.db import models


class Feedback(models.Model):
    site = models.ForeignKey(
        Site, models.SET_NULL, related_name='+', blank=True, null=True, default=None
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, models.SET_NULL, related_name='+', blank=True, null=True, default=None
    )
    email = models.EmailField(max_length=200)
    name = models.CharField(max_length=200)
    text = models.TextField()
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Feedback'
        verbose_name_plural = 'Feedback'

    def __str__(self):
        return str(self.id)
