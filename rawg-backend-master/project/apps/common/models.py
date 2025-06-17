from django.contrib.contenttypes.models import ContentType
from django.db import models
from ordered_model.models import OrderedModel

from apps.games.models import Developer, Genre, Platform, PlatformParent, Publisher, Store, Tag
from apps.utils.models import HiddenModel


class List(OrderedModel):
    content_type = models.ForeignKey(ContentType, models.CASCADE)
    name = models.CharField(max_length=100)
    title = models.CharField(max_length=200, blank=True, default='')
    description = models.TextField(blank=True, default='')

    class Meta:
        verbose_name = 'List'
        verbose_name_plural = 'Lists'
        ordering = ('order',)

    def __str__(self):
        return str(self.id)


class CatalogFilter(models.Model):
    platformparent = models.ForeignKey(
        PlatformParent, models.CASCADE, blank=True, default=None, null=True, db_index=False
    )
    platform = models.ForeignKey(Platform, models.CASCADE, blank=True, default=None, null=True, db_index=False)
    genre = models.ForeignKey(Genre, models.CASCADE, blank=True, default=None, null=True, db_index=False)
    year = models.PositiveSmallIntegerField(blank=True, default=None, null=True, db_index=False)
    store = models.ForeignKey(Store, models.CASCADE, blank=True, default=None, null=True, db_index=False)
    tag = models.ForeignKey(Tag, models.CASCADE, blank=True, default=None, null=True, db_index=False)
    developer = models.ForeignKey(Developer, models.CASCADE, blank=True, default=None, null=True, db_index=False)
    publisher = models.ForeignKey(Publisher, models.CASCADE, blank=True, default=None, null=True, db_index=False)
    name = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Catalog Filter'
        verbose_name_plural = 'Catalog Filters'
        unique_together = (
            'year', 'platform', 'platformparent', 'genre', 'store', 'tag', 'developer', 'publisher'
        )

    def __str__(self):
        return str(self.id)


class SeoLink(HiddenModel):
    ON_PAGE = 5
    BLOCKS = 8
    CYCLE_SHOWS = 50

    uri = models.CharField(max_length=200)
    name = models.CharField(max_length=200)
    created = models.DateTimeField(auto_now_add=True)
    shows_count = models.PositiveIntegerField(default=0, editable=False, db_index=True)
    cycles_count = models.PositiveIntegerField(default=0, editable=False, db_index=True)
    crawls_count = models.PositiveIntegerField(default=0, editable=False, db_index=True)

    class Meta:
        verbose_name = 'SEO Link'
        verbose_name_plural = 'SEO Links'
        ordering = ('crawls_count', 'cycles_count', 'id')

    def __str__(self):
        return self.uri


class SeoLinkShow(models.Model):
    seo_link = models.ForeignKey(SeoLink, models.CASCADE, editable=False, related_name='shows')
    on_uri = models.CharField(max_length=200, editable=False)
    created = models.DateTimeField(auto_now_add=True)
    ip = models.CharField(max_length=15, editable=False)
    user_agent = models.CharField(max_length=200, editable=False)

    class Meta:
        verbose_name = 'SEO Link Show'
        verbose_name_plural = 'SEO Link Shows'


class SeoLinkCrawl(models.Model):
    seo_link = models.ForeignKey(
        SeoLink, models.CASCADE, editable=False, blank=True, null=True, default=None, db_index=False,
        related_name='crawls'
    )
    uri = models.CharField(max_length=200, editable=False)
    created = models.DateTimeField(auto_now_add=True)
    ip = models.CharField(max_length=15, editable=False)
    user_agent = models.CharField(max_length=200, editable=False)

    class Meta:
        verbose_name = 'SEO Link Crawl'
        verbose_name_plural = 'SEO Link Crawls'
