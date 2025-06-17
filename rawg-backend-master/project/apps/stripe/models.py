from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models


class Payment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='payments')
    api_group = models.CharField(choices=get_user_model().API_GROUPS, default=settings.API_GROUP_FREE, max_length=10)
    subscription_id = models.CharField(max_length=100)
    invoice_id = models.CharField(max_length=100)
    until_date = models.DateTimeField()
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return str(self.pk)

    class Meta:
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
