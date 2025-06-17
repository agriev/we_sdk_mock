from django.conf import settings
from django.contrib.postgres.fields import ArrayField, JSONField
from django.contrib.postgres.indexes import BrinIndex
from django.db import models

from apps.recommendations.networks import NETWORKS_SELECTS, SLUG_MAX_LEN
from apps.utils.backend_storages import FileSystemStorage
from apps.utils.models import HiddenModel


class ClassificationQueue(models.Model):
    game = models.OneToOneField('games.Game', models.CASCADE, related_name='+', editable=False)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-id', )
        verbose_name = 'Classification Queue'
        verbose_name_plural = 'Classification Queue'

    def __str__(self):
        return str(self.id)


class Classification(models.Model):
    screenshot = models.OneToOneField('games.ScreenShot', models.CASCADE, related_name='+', editable=False)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    image_420 = models.FileField(
        upload_to='recommendations/image_420/', storage=FileSystemStorage(),
        blank=True, null=True, default=None, editable=False
    )
    squeezenet = models.FileField(
        upload_to='recommendations/squeezenet/', storage=FileSystemStorage(),
        blank=True, null=True, default=None, editable=False
    )
    googlenet_places = models.FileField(
        upload_to='recommendations/googlenet_places/', storage=FileSystemStorage(),
        blank=True, null=True, default=None, editable=False
    )

    class Meta:
        ordering = ('-id', )
        verbose_name = 'Classification'
        verbose_name_plural = 'Classifications'

    def __str__(self):
        return str(self.id)


class NeighborQueue(models.Model):
    classification = models.ForeignKey(Classification, models.CASCADE, related_name='+', editable=False)
    network = models.CharField(choices=NETWORKS_SELECTS, max_length=SLUG_MAX_LEN, db_index=True, editable=False)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-id', )
        verbose_name = 'Neighbor Queue'
        verbose_name_plural = 'Neighbor Queue'
        unique_together = ('classification', 'network')

    def __str__(self):
        return str(self.id)


class Neighbor(models.Model):
    game = models.ForeignKey('games.Game', models.CASCADE, related_name='+', editable=False)
    neighbors = JSONField(null=True, blank=True, editable=False)
    network = models.CharField(choices=NETWORKS_SELECTS, max_length=SLUG_MAX_LEN, db_index=True, editable=False)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-id', )
        verbose_name = 'Neighbor'
        verbose_name_plural = 'Neighbors'
        unique_together = ('game', 'network')

    def __str__(self):
        return str(self.id)


class ResultQueue(models.Model):
    game = models.OneToOneField('games.Game', models.CASCADE, related_name='+', editable=False)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-id', )
        verbose_name = 'Result Queue'
        verbose_name_plural = 'Result Queue'

    def __str__(self):
        return str(self.id)


class UserRecommendation(HiddenModel):
    SOURCES_LIBRARY_SIMILAR = 'similar'
    SOURCES_SUBSCRIBE = 'subscribe'
    SOURCES_COLLABORATIVE = 'collaborative'
    SOURCES_TRENDING = 'trending'
    SOURCES = (
        (SOURCES_LIBRARY_SIMILAR, 'Similar Library'),
        (SOURCES_SUBSCRIBE, 'Subscribe'),
        (SOURCES_COLLABORATIVE, 'Collaborative Suggestion'),
        (SOURCES_TRENDING, 'Trending'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    game = models.ForeignKey('games.Game', models.CASCADE, db_index=False)
    sources = ArrayField(models.CharField(max_length=13), default=list, db_index=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True, db_index=True)
    position = models.PositiveIntegerField(db_index=True)
    related_ids = ArrayField(models.CharField(max_length=30), default=list)

    class Meta:
        verbose_name = 'User Recommendation'
        verbose_name_plural = 'User Recommendations'
        unique_together = ('user', 'game')
        ordering = ('position',)

    def __str__(self):
        return str(self.id)


class UserRecommendationQueue(models.Model):
    TARGETS_META = 'meta'
    TARGETS_COLLABORATIVE = 'collaborative'
    TARGETS = (
        (TARGETS_META, 'Meta'),
        (TARGETS_COLLABORATIVE, 'Collaborative'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    datetime = models.DateTimeField(db_index=True)
    target = models.CharField(choices=TARGETS, default=TARGETS_META, max_length=13, db_index=True)

    class Meta:
        ordering = ('-id',)
        verbose_name = 'User Recommendation Queue'
        verbose_name_plural = 'User Recommendation Queue'

    def __str__(self):
        return str(self.id)


class UserRecommendationDislike(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    game = models.ForeignKey('games.Game', models.CASCADE, db_index=False)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'User Recommendation Dislike'
        verbose_name_plural = 'User Recommendation Dislikes'
        unique_together = ('user', 'game')
        ordering = ('-id',)
        indexes = [
            BrinIndex(fields=['created'])
        ]

    def __str__(self):
        return str(self.id)
