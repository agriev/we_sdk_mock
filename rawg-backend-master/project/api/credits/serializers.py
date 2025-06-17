from django.db import transaction
from django.http import QueryDict
from drf_haystack.serializers import HaystackSerializer
from rest_framework import serializers
from rest_framework.fields import empty

from api.functions import get_statistic_data
from api.games.serializers import DiscoverySubscriptionMixin, GameSerializer, GameShortestSerializer
from api.serializers_mixins import ReversionMixin
from apps.common import seo
from apps.credits import models, search_indexes
from apps.credits.tasks import update_person
from apps.games.tasks import update_game_totals
from apps.reviews.models import Review
from apps.utils.haystack import clear_id


class PersonPositionsMixin(object):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        persons_positions = self.context.get('persons_positions')
        if persons_positions:
            positions = []
            for position_id in instance.positions:
                positions.append(persons_positions[position_id])
            data['positions'] = PositionSerializer(positions, many=True, context=self.context).data
        return data


class PersonGamesMixin(object):
    short_games = False

    def to_representation(self, instance):
        data = super().to_representation(instance)
        persons_games = self.context.get('persons_games')
        if persons_games:
            serializer = GameShortestSerializer if self.short_games else GameSerializer
            data['games'] = serializer(persons_games.get(instance.id), many=True, context=self.context).data
        persons_positions = self.context.get('persons_positions')
        game_positions = self.context.get('persons_positions_games')
        if persons_positions:
            positions = []
            for position_id in game_positions.get(instance.id, []):
                positions.append(persons_positions[position_id])
            data['positions'] = PositionSerializer(positions, many=True, context=self.context).data
        backgrounds = self.context.get('persons_backgrounds')
        if backgrounds:
            data['image_background'] = backgrounds[instance.id]
        return data


class PersonSingleSerializer(
    ReversionMixin, PersonPositionsMixin, DiscoverySubscriptionMixin, serializers.ModelSerializer
):
    name = serializers.CharField(source='visible_name')
    description = serializers.CharField(source='visible_description', required=False)
    image = serializers.ImageField(source='visible_image', required=False)
    create_error = {'name': ['This name already exists.']}

    class Meta:
        model = models.Person
        fields = (
            'id', 'name', 'slug', 'image', 'image_background', 'description', 'games_count', 'reviews_count',
            'rating', 'rating_top', 'updated',
        )
        read_only_fields = (
            'id', 'slug', 'image_background', 'games_count', 'reviews_count', 'rating', 'rating_top', 'updated',
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)

        get_statistic_data(data, instance.statistics, ['platforms'], self.context['request'])

        data['ratings'] = (instance.statistics or {}).get('ratings')
        ratings = []
        percent = sum([count for count in data['ratings'].values()]) / 100 if data['ratings'] else 0
        total = 0
        for pk, title in Review.RATINGS:
            count = (data['ratings'] or {}).get(str(pk)) or 0
            if not count:
                continue
            total += count
            ratings.append({
                'id': pk,
                'title': title,
                'count': count,
                'percent': round(count / percent, 2) if percent else 0,
            })
        data['ratings'] = sorted(ratings, key=lambda x: -x['count'])

        data['timeline'] = (instance.statistics or {}).get('years') or []

        # last-modified
        if data.get('updated'):
            data['updated'] = instance.updated.strftime("%Y-%m-%dT%H:%M:%S")

        positions = [position['name'] for position in data.get('positions', [])]
        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            data.update(seo.person(data['name'], positions, self.context['request'], instance.auto_description))

        return data

    def run_validation(self, data: QueryDict = empty):
        validated_data = super().run_validation(data)
        if 'visible_name' in validated_data:
            validated_data['name'] = validated_data['visible_name']
            del validated_data['visible_name']
        if 'visible_description' in validated_data:
            validated_data['description'] = validated_data['visible_description']
            del validated_data['visible_description']
        if 'visible_image' in validated_data:
            validated_data['image'] = validated_data['visible_image']
            del validated_data['visible_image']
        return validated_data


class PersonSerializer(PersonGamesMixin, PersonPositionsMixin, serializers.ModelSerializer):
    name = serializers.CharField(source='visible_name')
    image = serializers.ImageField(source='visible_image')
    short_games = True

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if 'positions' in data:
            data['positions'] = data['positions'][0:3]
        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            data['following'] = getattr(instance, 'following', False)
        return data

    class Meta:
        model = models.Person
        fields = ('id', 'name', 'slug', 'image', 'image_background', 'games_count')
        read_only_fields = fields


class PersonSearchSerializer(PersonGamesMixin, HaystackSerializer):
    id = serializers.CharField()
    score = serializers.CharField()
    short_games = True

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = clear_id(data['id'])
        return data

    class Meta:
        index_classes = [search_indexes.PersonIndex]
        fields = ('id', 'slug', 'name', 'image', 'positions', 'games_count', 'image_background', 'score')


class GamePersonListSerializer(PersonGamesMixin, serializers.ModelSerializer):
    name = serializers.CharField(source='visible_name')
    image = serializers.ImageField(source='visible_image')

    class Meta:
        model = models.Person
        fields = ('id', 'name', 'slug', 'image', 'image_background', 'games_count')
        read_only_fields = fields


class GamePersonCreateSerializer(ReversionMixin, serializers.ModelSerializer):
    person = serializers.PrimaryKeyRelatedField(
        queryset=models.Person.objects.visible(),
        help_text='Id of a person from /api/creators.',
    )
    positions = serializers.PrimaryKeyRelatedField(
        queryset=models.Position.objects.all(),
        help_text='Id of a position from /api/creator-roles.',
        many=True
    )
    create_error = {
        'position': ['The person with this position has already added in the game.']
    }

    class Meta:
        model = models.GamePerson
        fields = ('person', 'positions')
        swagger_schema_fields = {
            'example': {
                'person': 123,
                'positions': [7, 8],
            }
        }

    def create(self, validated_data):
        validated_data['game_id'] = self.context['view'].game_id
        self.create = []
        for position in validated_data['positions']:
            self.create.append(models.GamePerson(
                game_id=self.context['view'].game_id,
                person_id=validated_data['person'].id,
                position_id=position.id
            ))
        return super().create(validated_data)

    def perform_create(self, validated_data):
        def on_commit():
            update_person.delay(self.create[0].person_id)
            update_game_totals.delay(self.context['view'].game_id, 'persons')
        transaction.on_commit(on_commit)
        models.GamePerson.objects.bulk_create(self.create, ignore_conflicts=True)
        return self.create[0]

    def update(self, instance, validated_data):
        self.positions = set(models.GamePerson.objects.filter(
            game_id=self.context['view'].game_id,
            person_id=instance.person_id,
        ).values_list('position_id', flat=True))
        self.create = []
        for position in validated_data['positions']:
            if position.id not in self.positions:
                self.create.append(models.GamePerson(
                    game_id=self.context['view'].game_id,
                    person_id=instance.person_id,
                    position_id=position.id
                ))
            if position.id in self.positions:
                self.positions.remove(position.id)
        return super().update(instance, validated_data)

    def perform_update(self, instance, validated_data):
        def on_commit():
            update_person.delay(instance.person_id)
            update_game_totals.delay(self.context['view'].game_id, 'persons')
        transaction.on_commit(on_commit)
        models.GamePerson.objects.bulk_create(self.create, ignore_conflicts=True)
        models.GamePerson.objects.filter(
            position_id__in=self.positions,
            person_id=instance.person_id,
            game_id=self.context['view'].game_id
        ).delete()
        return instance


class GamePersonUpdateSerializer(GamePersonCreateSerializer):
    positions = serializers.PrimaryKeyRelatedField(
        queryset=models.Position.objects.all(),
        many=True,
        write_only=True,
        help_text='Ids of positions from /api/positions.'
    )

    class Meta(GamePersonCreateSerializer.Meta):
        fields = ('positions',)
        swagger_schema_fields = {
            'example': {
                'positions': [3, 7],
            }
        }


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Position
        fields = ('id', 'name', 'slug')
        read_only_fields = fields
