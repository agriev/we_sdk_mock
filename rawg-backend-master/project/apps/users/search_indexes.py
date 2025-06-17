from django.contrib.auth import get_user_model
from django.db.models import Prefetch
from haystack import indexes

from apps.games.models import Game
from apps.utils.elastic import prepare_search
from apps.utils.haystack import CelerySearchIndex, CharCustom
from apps.utils.images import get_image_url


class UserIndex(CelerySearchIndex, indexes.Indexable):
    text = indexes.CharField(document=True, use_template=True)
    username = indexes.CharField(model_attr='username')
    exact_name = indexes.CharField(model_attr='username', indexed=False)
    search_name = CharCustom(model_attr='username', analyzer='standard')
    full_name = indexes.CharField(model_attr='full_name')
    exact_full_name = indexes.CharField(model_attr='full_name', indexed=False)
    search_full_name = CharCustom(model_attr='full_name', analyzer='standard')
    slug = indexes.CharField(model_attr='slug', indexed=False)
    avatar = indexes.CharField(null=True, indexed=False)
    games_count = indexes.IntegerField(model_attr='games_count')
    collections_count = indexes.IntegerField(model_attr='collections_count')
    image_background = indexes.CharField(null=True, indexed=False)

    def prepare_exact_name(self, obj):
        return prepare_search(obj.username)

    def prepare_search_name(self, obj):
        return prepare_search(obj.username)

    def prepare_exact_full_name(self, obj):
        return prepare_search(obj.full_name)

    def prepare_search_full_name(self, obj):
        return prepare_search(obj.full_name)

    def prepare_avatar(self, obj):
        return get_image_url(obj.avatar) if obj.avatar else None

    def prepare_image_background(self, obj):
        return obj.game_background.background_image_full if obj.game_background_id else None

    def get_model(self):
        return get_user_model()

    def index_queryset(self, using=None):
        return self.get_model().objects.filter(is_active=True).prefetch_related(
            Prefetch('game_background', queryset=Game.objects.only('id', 'image', 'image_background'))
        )
