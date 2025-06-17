from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import BrinIndex
from django.db import models
from django.utils.timezone import now

from apps.games.models import Game, Store


class Visit(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='+')
    datetime = models.DateTimeField(default=now, db_index=True)

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Visit'
        verbose_name_plural = 'Visits'
        ordering = ('-id',)
        indexes = [
            BrinIndex(fields=['datetime'])
        ]


class Status(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='+')
    status = models.CharField(max_length=10)
    datetime = models.DateTimeField(db_index=True)
    skip_auto_now = False

    def __str__(self):
        return str(self.id)

    def save(self, *args, **kwargs):
        if not self.skip_auto_now:
            self.datetime = now()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Status'
        verbose_name_plural = 'Statuses'
        ordering = ('-id',)
        indexes = [
            BrinIndex(fields=['datetime'])
        ]


class CarouselRating(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, models.SET_NULL, blank=True, null=True, related_name='+', editable=False
    )
    action = models.CharField(max_length=20, editable=False)
    slug = models.CharField(max_length=50, editable=False)
    rating = models.PositiveSmallIntegerField(blank=True, null=True, editable=False)
    cid = models.CharField(max_length=50, editable=False)
    ip = models.CharField(max_length=15, editable=False)
    user_agent = models.CharField(max_length=200, editable=False)
    datetime = models.DateTimeField(auto_now_add=True, db_index=True, editable=False)

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Carousel Rating'
        verbose_name_plural = 'Carousel Ratings'
        ordering = ('-id',)
        indexes = [
            BrinIndex(fields=['datetime'])
        ]


class Story(models.Model):
    cid = models.CharField(max_length=50, editable=False)
    second = models.PositiveIntegerField(editable=False)
    domain = models.CharField(max_length=50, blank=True, null=True, editable=False)
    ip = models.CharField(max_length=15, editable=False)
    user_agent = models.CharField(max_length=200, editable=False)
    datetime = models.DateTimeField(auto_now_add=True, db_index=True, editable=False)

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Story'
        verbose_name_plural = 'Stories'
        ordering = ('-id',)
        indexes = [
            BrinIndex(fields=['datetime'])
        ]


class RecommendationsVisit(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='+', editable=False)
    datetime = models.DateTimeField(auto_now_add=True, db_index=True, editable=False)

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Recommendations Visit'
        verbose_name_plural = 'Recommendations Visits'
        ordering = ('-id',)
        indexes = [
            BrinIndex(fields=['datetime'])
        ]


class RecommendedGameVisit(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='+', editable=False)
    game = models.ForeignKey(Game, models.CASCADE, related_name='+', editable=False)
    sources = ArrayField(models.CharField(max_length=13), default=list, editable=False)
    datetime = models.DateTimeField(auto_now_add=True, db_index=True, editable=False)
    referer = models.CharField(max_length=500, blank=True, default=None, null=True, editable=False)

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Recommended Game Visit'
        verbose_name_plural = 'Recommended Game Visits'
        ordering = ('-id',)
        indexes = [
            BrinIndex(fields=['datetime'])
        ]


class RecommendedGameAdding(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='+', editable=False)
    game = models.ForeignKey(Game, models.CASCADE, related_name='+', editable=False)
    status = models.CharField(max_length=10, default='', editable=False)
    sources = ArrayField(models.CharField(max_length=13), default=list, editable=False)
    datetime = models.DateTimeField(auto_now_add=True, db_index=True, editable=False)
    referer = models.CharField(max_length=500, blank=True, default=None, null=True, editable=False)

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Recommended Game Adding'
        verbose_name_plural = 'Recommended Game Adding'
        ordering = ('-id',)
        indexes = [
            BrinIndex(fields=['datetime'])
        ]


class RecommendedGameStoreVisit(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='+', editable=False)
    game = models.ForeignKey(Game, models.CASCADE, related_name='+', editable=False)
    store = models.ForeignKey(Store, models.CASCADE, related_name='+', editable=False)
    sources = ArrayField(models.CharField(max_length=13), default=list, editable=False)
    hidden = models.BooleanField(default=False, editable=False)
    datetime = models.DateTimeField(auto_now_add=True, db_index=True, editable=False)

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Recommended Game Store Visit'
        verbose_name_plural = 'Recommended Game Store Visits'
        ordering = ('-id',)
        indexes = [
            BrinIndex(fields=['datetime'])
        ]


class APIByUserAgentVisit(models.Model):
    user_agent = models.CharField(max_length=200, editable=False)
    date = models.DateField(db_index=True, editable=False)
    count = models.PositiveIntegerField(default=0, editable=False)

    class Meta:
        verbose_name = 'API by User Agent Visit'
        verbose_name_plural = 'API by User Agent Visits'
        ordering = ('-id',)

    def __str__(self):
        return str(self.id)


class APIByIPVisit(models.Model):
    ip = models.CharField(max_length=45, editable=False)
    date = models.DateField(db_index=True, editable=False)
    count = models.PositiveIntegerField(default=0, editable=False)

    class Meta:
        verbose_name = 'API by IP Visit'
        verbose_name_plural = 'API by IP Visits'
        ordering = ('-id',)

    def __str__(self):
        return str(self.id)


class APIByIPAndUserAgentVisit(models.Model):
    ip = models.CharField(max_length=45, editable=False)
    user_agent = models.CharField(max_length=200, editable=False)
    date = models.DateField(db_index=True, editable=False)
    count = models.PositiveIntegerField(default=0, editable=False)

    class Meta:
        verbose_name = 'API by IP and User Agent Visit'
        verbose_name_plural = 'API by IP and User Agent Visits'
        ordering = ('-id',)

    def __str__(self):
        return str(self.id)


class APIByUserVisit(models.Model):
    user_id = models.CharField(max_length=10, editable=False)
    date = models.DateField(db_index=True, editable=False)
    count = models.PositiveIntegerField(default=0, editable=False)

    class Meta:
        verbose_name = 'API by User Visit'
        verbose_name_plural = 'API by User Visits'
        ordering = ('-id',)

    def __str__(self):
        return str(self.id)


class APIUserCounter(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='+', editable=False)
    date = models.DateField(editable=False)
    count = models.PositiveIntegerField(editable=False)

    class Meta:
        verbose_name = 'API Counter'
        verbose_name_plural = 'API Counters'
        ordering = ('-id',)
        unique_together = ('user', 'date')

    def __str__(self):
        return str(self.id)
