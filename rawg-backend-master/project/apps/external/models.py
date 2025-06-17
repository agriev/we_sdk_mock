from django.conf import settings
from django.contrib.postgres.fields import JSONField
from django.db import models

from apps.games.models import Game
from apps.utils.models import ProjectModel


class RedditBase(ProjectModel):
    external_id = models.CharField(max_length=200, db_index=True)
    name = models.CharField(max_length=500)
    text = models.TextField()
    image = models.URLField(max_length=200, blank=True, null=True)
    raw_text = models.TextField()
    url = models.URLField(max_length=200)
    username = models.CharField(max_length=100, blank=True, default='')
    username_url = models.URLField(max_length=200, blank=True, default='')
    created = models.DateTimeField(db_index=True)

    def __str__(self):
        return self.name

    class Meta:
        abstract = True


class TwitchBase(ProjectModel):
    external_id = models.BigIntegerField(db_index=True)
    external_user_id = models.PositiveIntegerField(default=0)
    name = models.CharField(max_length=500)
    description = models.TextField(default='')
    created = models.DateTimeField()
    published = models.DateTimeField()
    thumbnail = models.URLField(max_length=200, default='')
    view_count = models.PositiveIntegerField(db_index=True, default=0)
    language = models.CharField(max_length=3, default=settings.MODELTRANSLATION_DEFAULT_LANGUAGE_ISO3, db_index=True)

    def __str__(self):
        return self.name

    class Meta:
        abstract = True


class YoutubeBase(ProjectModel):
    external_id = models.CharField(max_length=100, db_index=True)
    channel_id = models.CharField(max_length=100, blank=True, default='')
    channel_title = models.CharField(max_length=100, blank=True, default='')
    name = models.CharField(max_length=500)
    description = models.TextField(default='')
    created = models.DateTimeField()
    view_count = models.PositiveIntegerField(db_index=True, default=0)
    comments_count = models.PositiveIntegerField(db_index=True, default=0)
    like_count = models.PositiveIntegerField(db_index=True, default=0)
    dislike_count = models.PositiveIntegerField(db_index=True, default=0)
    favorite_count = models.PositiveIntegerField(db_index=True, default=0)
    thumbnails = JSONField(blank=True, null=True)
    language = models.CharField(
        max_length=3, default=settings.MODELTRANSLATION_DEFAULT_LANGUAGE_ISO3, db_index=True, editable=False
    )

    def __str__(self):
        return self.name

    class Meta:
        abstract = True


class ImgurBase(ProjectModel):
    external_id = models.CharField(max_length=100, db_index=True)
    image_id = models.CharField(max_length=100)
    name = models.CharField(max_length=500, blank=True, default='')
    description = models.TextField(default='')
    created = models.DateTimeField()
    image = models.URLField(max_length=200)
    url = models.URLField(max_length=200)
    is_gallery = models.BooleanField(default=None)
    view_count = models.PositiveIntegerField(db_index=True, default=0)
    comments_count = models.PositiveIntegerField(db_index=True, default=0)
    data = JSONField(blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        abstract = True


class Reddit(RedditBase):
    game = models.ForeignKey(Game, models.CASCADE)

    class Meta:
        ordering = ('-created',)
        verbose_name = 'Reddit'
        verbose_name_plural = 'Reddit'
        unique_together = ('game', 'external_id')


class Twitch(TwitchBase):
    game = models.ForeignKey(Game, models.CASCADE)

    class Meta:
        ordering = ('-view_count',)
        verbose_name = 'Twitch'
        verbose_name_plural = 'Twitch'
        unique_together = ('game', 'external_id')


class Youtube(YoutubeBase):
    game = models.ForeignKey(Game, models.CASCADE)

    class Meta:
        ordering = ('-view_count',)
        verbose_name = 'Youtube'
        verbose_name_plural = 'Youtube'
        unique_together = ('game', 'external_id', 'language')


class Imgur(ImgurBase):
    game = models.ForeignKey(Game, models.CASCADE)

    class Meta:
        ordering = ('-view_count',)
        verbose_name = 'Imgur'
        verbose_name_plural = 'Imgur'
        unique_together = ('game', 'external_id')


class WikiData(ProjectModel):
    game = models.ForeignKey(Game, models.CASCADE)
    wikidata = JSONField(blank=True, null=True)
    infobox = JSONField(blank=True, null=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.game.name

    class Meta:
        ordering = ('-id',)
        verbose_name = 'WikiData'
        verbose_name_plural = 'WikiData'
