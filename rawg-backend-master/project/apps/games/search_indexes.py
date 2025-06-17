import json
from decimal import Decimal

from haystack import indexes

from apps.games import models
from apps.utils.elastic import auto_synonyms, prepare_search
from apps.utils.haystack import CelerySearchIndex, CharCustom, MultiValueCustom


class CollectionIndex(CelerySearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    name = indexes.CharField(model_attr='name')
    exact_name = indexes.CharField(model_attr='name', indexed=False)
    search_name = CharCustom(model_attr='name', analyzer='standard')
    promo = indexes.CharField(model_attr='promo', indexed=False)
    noindex = indexes.BooleanField(model_attr='noindex')
    slug = indexes.CharField(model_attr='slug', indexed=False)
    games_count = indexes.IntegerField(model_attr='games_count')
    backgrounds = indexes.CharField(null=True, indexed=False)
    creator_id = indexes.IntegerField(model_attr='creator_id')

    def prepare_exact_name(self, obj):
        return prepare_search(obj.name)

    def prepare_search_name(self, obj):
        return prepare_search(obj.name)

    def prepare_backgrounds(self, obj):
        return json.dumps(obj.backgrounds) if obj.backgrounds else None

    def get_model(self):
        return models.Collection

    def index_queryset(self, using=None):
        return self.get_model().objects.filter(is_private=False)


class GameIndex(CelerySearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    more_like_this = CharCustom(use_template=True, analyzer='simple')
    slug = indexes.CharField(model_attr='slug', indexed=False)
    name = indexes.CharField(model_attr='name')
    name_en = indexes.CharField(model_attr='name_en', null=True)
    name_ru = indexes.CharField(model_attr='name_ru', null=True)
    exact_name = indexes.CharField(model_attr='name', indexed=False)
    search_name = CharCustom(model_attr='name', analyzer='standard')
    exact_names = indexes.MultiValueField(indexed=False)
    search_names = MultiValueCustom(analyzer='standard')
    promo = indexes.CharField(model_attr='promo', indexed=False)
    playtime = indexes.IntegerField(model_attr='playtime')
    description = indexes.CharField(model_attr='description', null=True)
    description_short = indexes.CharField(model_attr='description_short', default='')
    platforms = indexes.FacetMultiValueField(model_attr='platforms__id')
    parent_platforms = indexes.FacetMultiValueField(model_attr='platforms__parent_id')
    platforms_count = indexes.IntegerField(default=0)
    stores = indexes.FacetMultiValueField(model_attr='stores__id')
    developers = indexes.MultiValueField()
    developers_ids = indexes.MultiValueField(indexed=False)
    developers_slugs = indexes.MultiValueField(indexed=False)
    publishers = indexes.MultiValueField()
    publishers_ids = indexes.MultiValueField(indexed=False)
    publishers_slugs = indexes.MultiValueField(indexed=False)
    genres = indexes.MultiValueField()
    genres_ids = indexes.FacetMultiValueField()
    genres_slugs = indexes.MultiValueField(indexed=False)
    tags = indexes.MultiValueField()
    tags_ids = indexes.MultiValueField(indexed=False)
    tags_slugs = indexes.MultiValueField(indexed=False)
    creators_ids = indexes.MultiValueField(indexed=False)
    creators_slugs = indexes.MultiValueField(indexed=False)
    released = indexes.DateField(model_attr='released')
    released_year = indexes.IntegerField(model_attr='released__year', faceted=True)
    tba = indexes.BooleanField(model_attr='tba', default=False)
    background_image = indexes.CharField(model_attr='background_image_full', null=True, indexed=False)
    rating = indexes.IntegerField(model_attr='rating')
    rating_top = indexes.IntegerField(model_attr='rating_top')
    ratings = indexes.CharField(indexed=False)
    ratings_count = indexes.IntegerField(model_attr='ratings_count')
    reviews_text_count = indexes.IntegerField(model_attr='reviews_text_count')
    weighted_rating = indexes.IntegerField(model_attr='weighted_rating')
    added = indexes.IntegerField(model_attr='added')
    added_by_status = indexes.CharField(indexed=False)
    metacritic = indexes.IntegerField(model_attr='metacritic')
    charts = indexes.CharField(indexed=False)
    tags_json = indexes.CharField(indexed=False)
    screenshots_json = indexes.CharField(indexed=False)
    esrb_rating_json = indexes.CharField(indexed=False)
    clip_json = indexes.CharField(indexed=False)
    suggestions_count = indexes.IntegerField(model_attr='suggestions_count')
    created = indexes.DateTimeField(model_attr='created')
    updated = indexes.DateTimeField(model_attr='updated')
    additions_count = indexes.IntegerField(model_attr='additions_count')
    parents_count = indexes.IntegerField(model_attr='parents_count')
    game_series_count = indexes.IntegerField(model_attr='game_series_count')
    is_playable = indexes.BooleanField(model_attr='is_playable', default=False)

    def prepare_exact_name(self, obj):
        return prepare_search(obj.name)

    def prepare_search_name(self, obj):
        return self.prepare_exact_name(obj)

    def prepare_exact_names(self, obj):
        exact_name = self.prepare_exact_name(obj)
        data = []
        languages = []
        if obj.name_en:
            languages.append(obj.name_en)
        if obj.name_ru:
            languages.append(obj.name_ru)
        for rows in [obj.alternative_names, obj.synonyms, languages]:
            for item in rows or []:
                name = prepare_search(item)
                if name != exact_name and name not in data:
                    data.append(name)
        for name in auto_synonyms(obj.name):
            if name != exact_name and name not in data:
                data.append(name)
        return data

    def prepare_search_names(self, obj):
        return self.prepare_exact_names(obj)

    def prepare_developers(self, obj):
        return self._prepare_item(obj, 'developers')

    def prepare_developers_ids(self, obj):
        return self._prepare_item(obj, 'developers', 'id')

    def prepare_developers_slugs(self, obj):
        return self._prepare_item(obj, 'developers', 'slug')

    def prepare_publishers(self, obj):
        return self._prepare_item(obj, 'publishers')

    def prepare_publishers_ids(self, obj):
        return self._prepare_item(obj, 'publishers', 'id')

    def prepare_publishers_slugs(self, obj):
        return self._prepare_item(obj, 'publishers', 'slug')

    def prepare_genres(self, obj):
        return self._prepare_item(obj, 'genres')

    def prepare_genres_ids(self, obj):
        return self._prepare_item(obj, 'genres', 'id')

    def prepare_genres_slugs(self, obj):
        return self._prepare_item(obj, 'genres', 'slug')

    def prepare_tags(self, obj):
        return self._prepare_item(obj, 'tags')

    def prepare_tags_ids(self, obj):
        return self._prepare_item(obj, 'tags', 'id')

    def prepare_tags_slugs(self, obj):
        return self._prepare_item(obj, 'tags', 'slug')

    def prepare_creators_ids(self, obj):
        return self._prepare_item(obj, 'gameperson_set', 'person_id')

    def prepare_creators_slugs(self, obj):
        return self._prepare_item(obj, 'gameperson_set', 'person__slug')

    def prepare_ratings(self, obj):
        return json.dumps(obj.ratings)

    def prepare_rating(self, obj):
        return int(obj.rating * Decimal('100'))

    def prepare_charts(self, obj):
        return json.dumps(obj.charts)

    def prepare_added_by_status(self, obj):
        return json.dumps(obj.added_by_status)

    def prepare_tags_json(self, obj):
        return json.dumps(obj.tags_json)

    def prepare_screenshots_json(self, obj):
        return json.dumps(obj.screenshots_json)

    def prepare_esrb_rating_json(self, obj):
        return json.dumps(obj.esrb_rating_json)

    def prepare_clip_json(self, obj):
        return json.dumps(obj.clip_json)

    def prepare_platforms_count(self, obj):
        return len(obj.platforms_json) if obj.platforms_json else 0

    def _prepare_item(self, obj, name, attr='name'):
        data = getattr(obj, name).visible().values_list(attr, flat=True)
        if attr == 'id' or attr.endswith('_id'):
            data = map(int, data)
        return list(set(data))

    def get_model(self):
        return models.Game

    def index_queryset(self, using=None):
        return self.get_model().objects.order_by('-added')


class GameItemBaseIndex(CelerySearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True)
    name = indexes.CharField(model_attr='name')
    exact_name = indexes.CharField(model_attr='name', indexed=False)
    search_name = CharCustom(model_attr='name', analyzer='standard')
    slug = indexes.CharField(model_attr='slug', indexed=False)
    top_games = indexes.MultiValueField(model_attr='top_games', indexed=False)
    games_count = indexes.IntegerField(model_attr='games_count')
    image_background = indexes.CharField(model_attr='image_background', null=True, indexed=False)

    haystack_use_for_indexing = False
    model_class = models.GameItemBase

    def prepare_exact_name(self, obj):
        return prepare_search(obj.name)

    def prepare_search_name(self, obj):
        return prepare_search(obj.name)

    def get_model(self):
        return self.model_class

    def index_queryset(self, using=None):
        return self.get_model().objects.visible()


class GenreIndex(GameItemBaseIndex):
    name_en = indexes.CharField(model_attr='name_en', null=True)
    name_ru = indexes.CharField(model_attr='name_ru', null=True)
    search_names = MultiValueCustom(analyzer='standard')

    haystack_use_for_indexing = True
    model_class = models.Genre

    def prepare_search_names(self, obj):
        data = [obj.name]
        if obj.name_en and obj.name_en not in data:
            data.append(obj.name_en)
        if obj.name_ru and obj.name_ru not in data:
            data.append(obj.name_ru)
        return data


class TagIndex(GameItemBaseIndex):
    white = indexes.BooleanField(model_attr='white')

    haystack_use_for_indexing = True
    model_class = models.Tag


class DeveloperIndex(GameItemBaseIndex):
    haystack_use_for_indexing = True
    model_class = models.Developer


class PublisherIndex(GameItemBaseIndex):
    haystack_use_for_indexing = True
    model_class = models.Publisher


class PlatformIndex(GameItemBaseIndex):
    haystack_use_for_indexing = True
    model_class = models.Platform

    def index_queryset(self, using=None):
        return self.get_model().objects.all()
