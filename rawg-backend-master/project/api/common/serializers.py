from drf_haystack.serializers import HaystackSerializer
from rest_framework import serializers

from api.credits.serializers import PersonSearchSerializer, PersonSerializer
from api.games import serializers as games_serializers
from api.games.serializers import (
    CollectionSearchSerializer, DeveloperSearchSerializer, GameSearchSerializer, GameShortestSerializer,
    GenreSearchSerializer, PlatformSearchSerializer, PublisherSearchSerializer, TagSearchSerializer,
)
from api.users.serializers import UserSearchSerializer
from apps.common.models import List
from apps.credits.models import Person
from apps.credits.search_indexes import PersonIndex
from apps.games import models
from apps.games.search_indexes import (
    CollectionIndex, DeveloperIndex, GameIndex, GenreIndex, PlatformIndex, PublisherIndex, TagIndex,
)
from apps.users.search_indexes import UserIndex
from apps.utils.haystack import clear_id


class ListSerializer(serializers.ModelSerializer):
    serializers = {
        Person: (PersonSerializer, '-games_added'),
        models.Developer: (games_serializers.DeveloperSerializer, '-games_added'),
        models.Publisher: (games_serializers.PublisherSerializer, '-games_added'),
        models.Genre: (games_serializers.GenreSerializer, '-games_added'),
        models.Tag: (games_serializers.GenreSerializer, '-games_added'),
        models.Platform: (games_serializers.PlatformSerializer, 'order'),
        models.Store: (games_serializers.StoreSerializer, 'order'),
    }

    class Meta:
        model = List
        fields = ['id', 'name']
        read_only_fields = fields

    def to_representation(self, instance):
        is_short = self.context['view'].is_short
        data = super().to_representation(instance)
        model = instance.content_type.model_class()
        data['slug'] = model._meta.verbose_name_plural.lower()
        qs = model.objects
        is_hidden = 'hidden' in [field.name for field in model._meta.fields]
        if is_hidden:
            qs = qs.visible()
        data['count'] = {
            'table': model._meta.db_table,
            'is_hidden': is_hidden,
            'is_games_count': model._meta.db_table == 'games_tag',
        }
        serializer, order_by = self.serializers[model]
        items = qs.order_by(order_by)[0:3 if is_short else 9]
        data['items'] = serializer(items, many=True, context=self.context).data
        if not is_short:
            for i, item in enumerate(data['items']):
                item['top_games'] = items[i].top_games[0:3]
        return data


class SearchSerializer(HaystackSerializer):
    class Meta:
        serializers = {
            PublisherIndex: PublisherSearchSerializer,
            DeveloperIndex: DeveloperSearchSerializer,
            PersonIndex: PersonSearchSerializer,
            GenreIndex: GenreSearchSerializer,
            PlatformIndex: PlatformSearchSerializer,
            TagIndex: TagSearchSerializer,
            CollectionIndex: CollectionSearchSerializer,
            UserIndex: UserSearchSerializer,
            GameIndex: GameSearchSerializer,
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['instance'] = instance.model_name
        if getattr(instance, 'top_games', None):
            top_games = self.context.get('top_games')
            if top_games:
                rows = [top_games[game_id] for game_id in instance.top_games if top_games.get(game_id)][0:3]
                data['games'] = GameShortestSerializer(rows, many=True, context=self.context).data
            if 'top_games' in data:
                del data['top_games']
        if 'following_elements' in self.context:
            data['following'] = (clear_id(instance.id), instance.model_name) in self.context['following_elements']
        return data
