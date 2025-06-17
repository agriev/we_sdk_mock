from django.db import models

from apps.games.models import Game


class AdFoxCompanyParameter(models.Model):
    COMPANY_CHOICES = [
        ('DESKTOP', 'Desktop'),
        ('DESKTOP_REWARDED', 'Desktop rewarded'),
        ('MOBILE', 'Mobile'),
        ('MOBILE_REWARDED', 'Mobile rewarded'),
    ]
    company = models.CharField(choices=COMPANY_CHOICES, max_length=50)
    name = models.CharField(max_length=3)
    value = models.CharField(max_length=255)
    game = models.ForeignKey('games.Game', on_delete=models.CASCADE, related_name='fox_parameters')

    class Meta:
        verbose_name = 'AdFox game company parameter'
        verbose_name_plural = 'AdFox game company parameters'
        ordering = ('game_id',)
