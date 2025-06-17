import select2.fields
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import BrinIndex
from django.db import models
from django.utils.timezone import now
from ordered_model.models import OrderedModel

from apps.credits.models import Person
from apps.games.models import Developer, Game, Genre, Platform, PlatformParent, Publisher, Store, Tag
from apps.utils.fields.autoslug import CIAutoSlugField
from apps.utils.lang import get_site_by_current_language

ORDERING_CHOICES = (
    ('added', 'Popularity: Ascending'),
    ('-added', 'Popularity: Descending',),
    ('released', 'Released: Ascending'),
    ('-released', 'Released: Descending',),
    ('name', 'Name: Ascending'),
    ('-name', 'Name: Descending',),
    ('created', 'Date Added: Ascending'),
    ('-created', 'Date Added: Descending',),
    ('rating', 'Rating: Ascending'),
    ('-rating', 'Rating: Descending',),
)


class Suggestion(OrderedModel):
    name = models.CharField(max_length=100)
    slug = CIAutoSlugField(populate_from='name', unique=True)
    description = models.CharField(max_length=1000, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(default=None, null=True)
    top_games = ArrayField(models.PositiveIntegerField(), default=list, editable=False)
    games_count = models.PositiveIntegerField(default=0, editable=False)
    related_tags = ArrayField(models.PositiveIntegerField(), default=list, editable=False)
    image = models.URLField(max_length=200, default=None, null=True)
    limit = models.IntegerField(null=True, blank=True)

    class Meta:
        indexes = (
            BrinIndex(fields=['created']),
        )
        ordering = ('order', )
        verbose_name = 'Suggestion'
        verbose_name_plural = 'Suggestions'

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return f'{settings.SITE_PROTOCOL}://{get_site_by_current_language().name}/games/suggestions/{self.slug}'

    @classmethod
    def get_many_context(cls, suggestions, request):
        result = {}
        games_ids = []
        for suggestion in suggestions:
            suggestion.top_games = suggestion.top_games[0:12]
            games_ids.extend(suggestion.top_games)
        games = Game.objects.defer_all().in_bulk(games_ids)
        result = {'suggested_games': {}}
        for suggestion in suggestions:
            result['suggested_games'][suggestion.id] = []
            for pk in suggestion.top_games:
                result['suggested_games'][suggestion.id].append(games[pk])
        return result

    def get_filters(self):
        filter_instance = self.suggestionfilters_set.all()[0]
        filters = {}

        datetime_field = 'released'
        # contenttype filtering
        if getattr(filter_instance, 'platform'):
            filters['gameplatform__platform'] = filter_instance.platform_id
            datetime_field = 'gameplatform__released_at'
        if getattr(filter_instance, 'platformparent'):
            filters['gameplatform__platform__parent'] = filter_instance.platformparent_id
        if getattr(filter_instance, 'person'):
            filters['gameperson'] = filter_instance.person_id
        for field in ('genre', 'store', 'tag', 'developer', 'publisher'):
            if getattr(filter_instance, field):
                filters[f'{field}s'] = getattr(filter_instance, f'{field}_id')

        # datetime filtering
        if filter_instance.from_date:
            filters[f'{datetime_field}__gte'] = getattr(filter_instance, 'from_date')
        if filter_instance.from_now:
            filters[f'{datetime_field}__gte'] = now()
        if filter_instance.to_date:
            filters[f'{datetime_field}__lte'] = getattr(filter_instance, 'to_date')
        if filter_instance.to_now:
            filters[f'{datetime_field}__lte'] = now()

        if filter_instance.released_only:
            filters[f'{datetime_field}__isnull'] = False
            filters['tba'] = False
        return filters

    def get_ordering(self):
        filter_instance = self.suggestionfilters_set.all()[0]
        ordering = filter_instance.ordering
        if not ordering:
            return None
        return filter_instance.ordering

    def get_games_count(self):
        if self.limit:
            return self.limit
        filters = self.get_filters()
        games_qs = Game.objects.filter(**filters)
        return games_qs.count()

    def get_top_games(self):
        ids = list(
            Game.objects
            .filter(**self.get_filters())
            .order_by('-added', '-id')
            .values_list('id', flat=True)[:24]
        )
        data = []
        for pk in ids:
            if pk in data:
                continue
            data.append(pk)
        return data[0:12]

    def get_suggestion_image(self):
        filters = self.get_filters()
        platforms_qs = Platform.objects.prefetch_related('parent')
        image = None
        if filters.get('gameplatform__platform'):
            image = platforms_qs \
                .filter(id=filters.get('gameplatform__platform')) \
                .first() \
                .image
        elif filters.get('gameplatform__platform__parent'):
            image = platforms_qs \
                .filter(parent__id=filters.get('gameplatform__platform__parent')) \
                .first() \
                .image
        if image:
            return image.url
        return None

    def get_related_tags(self):
        return list(
            Game.objects.all()
            .values('tags')
            .annotate(tags_count=models.Count('tags__id'))
            .filter(**self.get_filters())
            .order_by('-tags_count')
            .values_list('tags', flat=True)[:30]
        )

    def set_statistics(self):
        Suggestion.objects.filter(id=self.id).update(
            games_count=self.get_games_count(),
            image=self.get_suggestion_image(),
            top_games=self.get_top_games(),
            related_tags=self.get_related_tags(),
        )


class SuggestionFilters(models.Model):
    suggestion = models.ForeignKey('Suggestion', models.CASCADE)
    from_date = models.DateTimeField(null=True)
    to_date = models.DateTimeField(null=True)
    from_now = models.BooleanField(default=False)
    to_now = models.BooleanField(default=False)
    released_only = models.BooleanField(default=False)

    platformparent = select2.fields.ForeignKey(
        PlatformParent,
        models.CASCADE,
        blank=True,
        ajax=True,
        search_field=lambda q: models.Q(pk__startswith=q) | models.Q(name__icontains=q),
        default=None,
        null=True,
        db_index=False
    )
    platform = select2.fields.ForeignKey(
        Platform,
        models.CASCADE,
        blank=True,
        ajax=True,
        search_field=lambda q: models.Q(pk__startswith=q) | models.Q(name__icontains=q),
        default=None,
        null=True,
        db_index=False
    )
    genre = select2.fields.ForeignKey(
        Genre,
        models.CASCADE,
        blank=True,
        ajax=True,
        search_field=lambda q: models.Q(pk__startswith=q) | models.Q(name__icontains=q),
        default=None,
        null=True,
        db_index=False
    )
    store = select2.fields.ForeignKey(
        Store,
        models.CASCADE,
        blank=True,
        ajax=True,
        search_field=lambda q: models.Q(pk__startswith=q) | models.Q(name__icontains=q),
        default=None,
        null=True,
        db_index=False
    )
    tag = select2.fields.ForeignKey(
        Tag,
        models.CASCADE,
        blank=True,
        ajax=True,
        search_field=lambda q: models.Q(pk__startswith=q) | models.Q(name__icontains=q),
        default=None,
        null=True,
        db_index=False
    )
    developer = select2.fields.ForeignKey(
        Developer,
        models.CASCADE,
        blank=True,
        ajax=True,
        search_field=lambda q: models.Q(pk__startswith=q) | models.Q(name__icontains=q),
        default=None,
        null=True,
        db_index=False
    )
    publisher = select2.fields.ForeignKey(
        Publisher,
        models.CASCADE,
        blank=True,
        ajax=True,
        search_field=lambda q: models.Q(pk__startswith=q) | models.Q(name__icontains=q),
        default=None,
        null=True,
        db_index=False
    )
    person = select2.fields.ForeignKey(
        Person,
        models.CASCADE,
        blank=True,
        ajax=True,
        search_field=lambda q: models.Q(pk__startswith=q) | models.Q(name__icontains=q),
        default=None,
        null=True,
        db_index=False
    )

    ordering = models.CharField(
        choices=ORDERING_CHOICES,
        max_length=50, blank=True, null=True
    )

    class Meta:
        verbose_name = 'Suggestion Filter'
        verbose_name_plural = 'Suggestion Filters'

    def __str__(self):
        return f'{self.suggestion} — Suggestion Filter'
