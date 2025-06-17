from haystack import indexes

from apps.credits import models
from apps.utils.elastic import prepare_search
from apps.utils.haystack import CelerySearchIndex, CharCustom
from apps.utils.images import get_image_url


class PersonIndex(CelerySearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    name = indexes.CharField(model_attr='visible_name')
    exact_name = indexes.CharField(model_attr='name', indexed=False)
    search_name = CharCustom(model_attr='name', analyzer='standard')
    slug = indexes.CharField(model_attr='slug', indexed=False)
    image = indexes.CharField(model_attr='image', null=True, indexed=False)
    positions = indexes.FacetMultiValueField(model_attr='positions')
    top_games = indexes.MultiValueField(model_attr='top_games', indexed=False)
    games_count = indexes.IntegerField(model_attr='games_count')
    image_background = indexes.CharField(model_attr='image_background', null=True, indexed=False)

    def prepare_exact_name(self, obj):
        return prepare_search(obj.name)

    def prepare_search_name(self, obj):
        return prepare_search(obj.name)

    def prepare_image(self, obj):
        image = obj.image if obj.image else obj.image_wiki
        return get_image_url(image) if image else None

    def get_model(self):
        return models.Person

    def index_queryset(self, using=None):
        return self.get_model().objects.visible()
