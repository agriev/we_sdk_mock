import json
import re
from copy import deepcopy
from datetime import date
from decimal import Decimal
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError, transaction
from django.http import QueryDict
from django.template.defaultfilters import linebreaksbr, striptags, urlize
from django.urls import reverse
from django.utils.functional import cached_property
from django.utils.html import linebreaks
from drf_haystack.serializers import HaystackSerializer
from drf_yasg import openapi
from psycopg2 import errorcodes
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.fields import empty
from rest_framework.generics import get_object_or_404

from api.comments.serializers import BaseCommentSerializer, BaseLikeSerializer
from api.games.fields import MetacriticField, RedditField
from api.serializers_mixins import RetryCreateMixin, ReversionMixin, SearchMixin
from api.users.serializers import UserSerializer
from apps.achievements.models import Achievement
from apps.comments.models import CommentCollectionFeed, CommentDiscussion, CommentReview, LikeCollectionFeed
from apps.common import seo
from apps.common.cache import CommonContentType
from apps.common.seo import hide_description
from apps.discussions.models import Discussion
from apps.external.models import Imgur, Twitch, Youtube
from apps.games import models, search_indexes
from apps.games.apps import GamesConfig
from apps.games.cache import GenreList, PlatformList, PlatformParentList, PlatformParentListByPlatform, StoreList
from apps.games.tasks import update_game_json_field
from apps.oauth2.models import Client
from apps.reviews.models import EditorialReview, Review
from apps.users.models import PlayerBase, UserFollowElement
from apps.utils.api import get_object_or_none
from apps.utils.dicts import find
from apps.utils.game_session import PlayerGameSessionController
from apps.utils.haystack import clear_id
from apps.utils.strings import br_to_new_line, get_plain_text, keep_tags, markdown
from implemented.external import ShowReddit
from implemented.games import ShowCounters
from repositories.games import game as game_mapper

RE_REQUIREMENTS = re.compile(r'<br\s*?>')


class DiscoverySubscriptionMixin:
    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request.API_CLIENT_IS_WEBSITE and request.user.is_authenticated:
            data['following'] = bool(UserFollowElement.objects.filter(
                content_type=ContentType.objects.get_for_model(instance),
                object_id=instance.id,
                user=request.user
            ).first())
        return data


class GameItemBaseSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['id', 'name', 'slug', 'games_count', 'image_background']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        items_games = self.context.get('items_games')
        if items_games:
            data['games'] = GameShortestSerializer(items_games.get(instance.id), many=True, context=self.context).data
        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            data['following'] = getattr(instance, 'following', False)
        return data


class GameItemBaseSingleSerializer(GameItemBaseSerializer):
    class Meta(GameItemBaseSerializer):
        fields = GameItemBaseSerializer.Meta.fields + ['description']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        hide_description(instance, data)
        data['description'] = markdown(data['description'])
        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            data.update(seo.game_item(
                data['name'], data['description'], self.context['request'],
                instance.language if hasattr(instance, 'language') else None
            ))
        return data


class GameItemBaseSearchSerializer(SearchMixin, HaystackSerializer):
    id = serializers.CharField()
    score = serializers.CharField()

    class Meta:
        index_classes = []
        fields = ['id', 'slug', 'name', 'games_count', 'image_background', 'score']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = clear_id(data['id'])
        return data


class DeveloperSerializer(GameItemBaseSerializer):
    class Meta(GameItemBaseSerializer.Meta):
        model = models.Developer


class PublisherSerializer(GameItemBaseSerializer):
    class Meta(GameItemBaseSerializer.Meta):
        model = models.Publisher


class GenreSerializer(GameItemBaseSerializer):
    class Meta(GameItemBaseSerializer.Meta):
        model = models.Genre


class GenreAllLanguagesSerializer(GenreSerializer):
    class Meta(GenreSerializer.Meta):
        fields = GenreSerializer.Meta.fields + ['name_ru', 'name_en']


class TagSerializer(GameItemBaseSerializer):
    class Meta(GameItemBaseSerializer.Meta):
        model = models.Tag
        fields = GameItemBaseSerializer.Meta.fields + ['language']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            data['white'] = instance.white
        return data


class TagShortSerializer(TagSerializer):
    class Meta(TagSerializer.Meta):
        fields = ['id', 'slug', 'name']


class DeveloperSingleSerializer(DiscoverySubscriptionMixin, GameItemBaseSingleSerializer):
    class Meta(GameItemBaseSingleSerializer.Meta):
        model = models.Developer

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            data.update(seo.game_developer(data['name'], self.context['request']))
        return data


class PublisherSingleSerializer(DiscoverySubscriptionMixin, GameItemBaseSingleSerializer):
    class Meta(GameItemBaseSingleSerializer.Meta):
        model = models.Publisher

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            data.update(seo.game_publisher(data['name'], self.context['request']))
        return data


class GenreSingleSerializer(DiscoverySubscriptionMixin, GameItemBaseSingleSerializer):
    class Meta(GameItemBaseSingleSerializer.Meta):
        model = models.Genre


class TagSingleSerializer(DiscoverySubscriptionMixin, GameItemBaseSingleSerializer):
    class Meta(GameItemBaseSingleSerializer.Meta):
        model = models.Tag
        fields = GameItemBaseSingleSerializer.Meta.fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            data['white'] = instance.white
        return data


class GenreSearchSerializer(GameItemBaseSearchSerializer):
    class Meta(GameItemBaseSearchSerializer.Meta):
        index_classes = [search_indexes.GenreIndex]
        fields = GameItemBaseSearchSerializer.Meta.fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        self.translate_fields(data, instance, 'name')
        return data


class TagSearchSerializer(GameItemBaseSearchSerializer):
    class Meta(GameItemBaseSearchSerializer.Meta):
        index_classes = [search_indexes.TagIndex]
        fields = GameItemBaseSearchSerializer.Meta.fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            data['white'] = instance.white
        return data


class DeveloperSearchSerializer(GameItemBaseSearchSerializer):
    class Meta(GameItemBaseSearchSerializer.Meta):
        index_classes = [search_indexes.DeveloperIndex]


class PublisherSearchSerializer(GameItemBaseSearchSerializer):
    class Meta(GameItemBaseSearchSerializer.Meta):
        index_classes = [search_indexes.PublisherIndex]


class PlatformSearchSerializer(GameItemBaseSearchSerializer):
    class Meta(GameItemBaseSearchSerializer.Meta):
        index_classes = [search_indexes.PlatformIndex]


class ESRBRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ESRBRating
        fields = ['id', 'name', 'slug']


class ESRBRatingAllLanguagesSerializer(ESRBRatingSerializer):
    class Meta(ESRBRatingSerializer.Meta):
        fields = ESRBRatingSerializer.Meta.fields + ['name_ru', 'name_en']


class StoreSerializer(GameItemBaseSerializer):
    class Meta(GameItemBaseSerializer.Meta):
        model = models.Store
        fields = ('id', 'name', 'domain', 'slug', 'games_count', 'image_background')


class StoreSingleSerializer(DiscoverySubscriptionMixin, GameItemBaseSingleSerializer):
    class Meta(GameItemBaseSingleSerializer.Meta):
        model = models.Store
        fields = ('id', 'name', 'domain', 'slug', 'games_count', 'image_background', 'description')


class PlatformMixin:
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # if here is empty there is url
        if not data['image_background'] and instance.image_background:
            data['image_background'] = instance.image_background
        return data


class PlatformSerializer(PlatformMixin, GameItemBaseSerializer):
    image_background = serializers.ImageField(source='image_background_custom')

    class Meta(GameItemBaseSerializer.Meta):
        model = models.Platform
        fields = GameItemBaseSerializer.Meta.fields + ['image', 'year_start', 'year_end']


class PlatformSingleSerializer(PlatformMixin, DiscoverySubscriptionMixin, GameItemBaseSingleSerializer):
    image_background = serializers.ImageField(source='image_background_custom')

    class Meta(GameItemBaseSingleSerializer.Meta):
        model = models.Platform
        fields = GameItemBaseSingleSerializer.Meta.fields + ['image', 'year_start', 'year_end']


class PlatformParentSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PlatformParent
        fields = ('id', 'name', 'slug')


class PlatformParentSingleSerializer(serializers.ModelSerializer):
    platforms = PlatformSerializer(many=True, source='platform_set')

    class Meta:
        model = models.PlatformParent
        fields = ('id', 'name', 'slug', 'platforms')


class GamePlatformSerializer(serializers.ModelSerializer):
    platform = PlatformSerializer()

    class Meta:
        model = models.GamePlatform
        fields = ('platform', 'requirements_en', 'requirements_ru', 'released_at')


class GamePlatformSmallSerializer(GamePlatformSerializer):
    class Meta:
        model = models.GamePlatform
        fields = ('platform',)


class GameStoreSerializer(serializers.ModelSerializer):
    store = StoreSerializer()

    class Meta:
        model = models.GameStore
        fields = ('id', 'store', 'url', 'url_en', 'url_ru')
        read_only_fields = ('id',)


class GameStoreFullSerializer(GameStoreSerializer):
    class Meta:
        model = models.GameStore
        fields = ('id', 'game_id', 'store_id', 'url')
        read_only_fields = ('id',)


class SuggestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Game
        fields = ('id', 'name')
        read_only_fields = ('id',)


class ScreenShotSerializer(ReversionMixin, serializers.ModelSerializer):
    image = serializers.FileField(help_text='An image file with size up to 20 MB.')
    hidden = serializers.BooleanField(default=False, write_only=True, help_text='Set image as hidden or visible.')

    class Meta:
        model = models.ScreenShot
        fields = ('id', 'image', 'hidden', 'width', 'height')
        read_only_fields = ('id', 'width', 'height')
        swagger_schema_fields = {
            'example': {
                'image': '@image.jpg',
                'hidden': False,
            }
        }

    def run_validation(self, data: QueryDict = empty):
        validated_data = super().run_validation(data)
        validated_data['game_id'] = self.context['view'].game_id
        return validated_data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # if here is empty there is url
        if not data['image'] and instance.visible_image:
            data['image'] = instance.visible_image
        data['is_deleted'] = True if instance.hidden else False
        if (
            self.context and self.context['view'].action == 'retrieve'
            and self.context['request'].API_CLIENT_IS_WEBSITE
        ):
            data.update(seo.game_screenshot(data['id'], instance.game_name, self.context['request']))
        return data

    def perform_create(self, validated_data):
        instance = self.Meta.model(**validated_data)
        instance.is_form = True
        instance.save()
        game = models.Game.objects.only('id').get(id=validated_data.get('game_id'))
        game.set_background_image(True)
        return instance

    def update(self, instance, validated_data):
        instance.is_form = True
        return super().update(instance, validated_data)

    def update_action(self, instance, validated_data):
        instance.game.set_background_image()


class ScreenShotShortSerializer(ScreenShotSerializer):
    class Meta(ScreenShotSerializer.Meta):
        fields = ('id', 'image')
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        del data['is_deleted']
        return data


class MovieSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Movie
        fields = ('id', 'name', 'preview', 'data')
        read_only_fields = ('id', 'name', 'preview', 'data')


class GameSerializerMixin:
    hide_small_top_rating = True

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = clear_id(data['id'])

        data['user_game'] = None
        users_games = self.context.get('users_games')
        if users_games:
            data['user_game'] = (users_games or {}).get(data['id'])

        users_offers = self.context.get('users_offers')
        if users_offers:
            data['user_offer'] = None
            user = users_offers.get(data['id'])
            if user:
                data['user_offer'] = UserSerializer(user, context=self.context).data

        if 'users_reviews' in self.context:
            data['user_review'] = (self.context['users_reviews'] or {}).get(data['id'])
        if 'users_reviews_ratings' in self.context:
            # https://3.basecamp.com/3964781/buckets/11225688/todos/1683943705 and see below "update ratings"
            data['community_rating'] = data['rating_top']
            data['user_rating'] = (self.context.get('users_reviews_ratings') or {}).get(data['id']) or 0
            data['rating_top'] = data['user_rating']

        # if here is empty there is url
        if not data['background_image'] and instance.background_image:
            data['background_image'] = instance.background_image

        # set default values to None
        if data.get('released') and data['released'] == '1900-01-01':
            data['released'] = None
        if 'metacritic' in data and data['metacritic'] == 0:
            data['metacritic'] = None

        # update description
        if (
            'description' in data
            and getattr(instance, f'description_{self.context["request"].LANGUAGE_CODE}_is_plain_text')
        ):
            data['description'] = markdown(data['description'])

        # update ratings
        if 'ratings' in data:
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
            data['reviews_count'] = total
            if total < models.Game.RATING_TRESHOLD:
                data['community_rating'] = 0
                if self.hide_small_top_rating:
                    data['rating_top'] = 0

        # update last users by status
        if 'games_statuses' in self.context:
            statuses, users = self.context['games_statuses']
            data['users'] = statuses.get(data['id'])
            data['users']['results'] = []
            last = data['users'].get('last')
            if last:
                del data['users']['last']
                for user_id in last:
                    user = users.get(user_id)
                    if not user:
                        continue
                    data['users']['results'].append(UserSerializer(user, context=self.context).data)
            elif getattr(instance, 'count', None):
                data['users']['count'] = instance.count

        # last-modified
        if data.get('updated'):
            data['updated'] = instance.updated.strftime("%Y-%m-%dT%H:%M:%S")

        # promo
        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            data['promo'] = instance.promo

        # title
        if (
            self.context and self.context['request'].LANGUAGE_CODE == settings.LANGUAGE_RU
            and instance.added < 5
            and instance.platforms_json
            and sorted([x['platform']['slug'] for x in instance.platforms_json])
            in (['android'], ['ios'], ['android', 'ios'])
        ):
            instance.name = instance.name_en
            data['name'] = instance.name_en

        data['saturated_color'] = '0f0f0f'
        data['dominant_color'] = '0f0f0f'

        return data


class GameJSONSerializerMixin:
    short_platforms = True

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if not data['background_image'] and instance.background_image:
            data['background_image'] = instance.background_image

        api_group = self.context['request'].API_GROUP

        for field in self.Meta.json_fields:
            field_name = field.replace('_json', '')
            empty_value = [] if field_name.endswith('s') else None
            if api_group and api_group == settings.API_GROUP_FREE and field == 'clip_json':
                data[field_name] = empty_value
                continue
            data[field_name] = getattr(instance, field, None) or empty_value

        if 'platforms' in data.keys():
            data['parent_platforms'] = []

            if instance.parent_platforms_json:
                for platform in instance.parent_platforms_json:
                    data['parent_platforms'].append({
                        'platform': platform
                    })

            if self.short_platforms:
                for platform in data['platforms']:
                    platform.pop('requirements', True)
            else:
                game_platform_instance = models.GamePlatform()
                for platform in data['platforms']:
                    if 'requirements_en' not in platform and 'requirements_ru' not in platform:
                        continue
                    en = platform['requirements_en'] or {}
                    ru = platform['requirements_ru'] or {}
                    if not self.context['request'].API_CLIENT_IS_WEBSITE:
                        for key, value in en.items():
                            en[key] = striptags(RE_REQUIREMENTS.sub('\n', value or '').replace('\t', ''))
                        for key, value in ru.items():
                            ru[key] = striptags(RE_REQUIREMENTS.sub('\n', value or '').replace('\t', ''))
                    game_platform_instance.requirements = en
                    game_platform_instance.requirements_en = en
                    game_platform_instance.requirements_ru = ru
                    platform['requirements'] = game_platform_instance.requirements
                    del platform['requirements_en'], platform['requirements_ru']

        if 'genres' in data.keys():
            genre_instance = models.Genre()
            for genre in data['genres']:
                if 'name_en' not in genre and 'name_ru' not in genre:
                    continue
                genre_instance.name = genre['name']
                genre_instance.name_en = genre['name_en']
                genre_instance.name_ru = genre['name_ru']
                genre['name'] = genre_instance.name
                del genre['name_en'], genre['name_ru']

        if 'stores' in data.keys():
            if self.context['view'].action == 'retrieve':
                game_store_instance = models.GameStore()
                for store in data['stores']:
                    if 'url_en' not in store and 'url_ru' not in store:
                        continue
                    game_store_instance.url = store['url']
                    game_store_instance.url_en = store['url_en']
                    game_store_instance.url_ru = store['url_ru']
                    store['url'] = game_store_instance.url
                    del store['url_en'], store['url_ru']
                for store in data['stores']:
                    store['url'] = models.Store.update_link(
                        store['url'], store['store']['slug'], self.context['request'].LANGUAGE_CODE
                    )
                if api_group and api_group == settings.API_GROUP_FREE:
                    for store in data['stores']:
                        if 'url' in store:
                            store['url'] = ''
            else:
                for store in data['stores']:
                    if 'url' in store:
                        del store['url'], store['url_en'], store['url_ru']

        if 'tags' in data.keys():
            filtered_tags = []
            for tag in data['tags']:
                lang = tag.get('language') or settings.MODELTRANSLATION_DEFAULT_LANGUAGE_ISO3
                if lang == self.context['request'].LANGUAGE_CODE_ISO3 or lang not in settings.LANGUAGES_3_TO_2:
                    filtered_tags.append(tag)
            data['tags'] = filtered_tags

        if (
            'esrb_rating' in data.keys() and data['esrb_rating']
            and 'name_en' in data['esrb_rating'] and 'name_ru' in data['esrb_rating']
        ):
            game_instance = models.ESRBRating()
            game_instance.name = data['esrb_rating']['name']
            game_instance.name_en = data['esrb_rating']['name_en']
            game_instance.name_ru = data['esrb_rating']['name_ru']
            data['esrb_rating']['name'] = game_instance.name
            del data['esrb_rating']['name_en'], data['esrb_rating']['name_ru']

        return data


class GameShortSerializer(GameSerializerMixin, serializers.ModelSerializer):
    background_image = serializers.ImageField()

    class Meta:
        model = models.Game
        fields = (
            'id', 'slug', 'name', 'released', 'tba', 'background_image', 'rating_top', 'ratings', 'added',
        )
        read_only_fields = fields


class GameShortestSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Game
        fields = (
            'id', 'slug', 'name', 'added',
        )


class SitemapGameSerializer(GameShortestSerializer):
    class Meta:
        model = models.Game
        fields = ('id', 'slug', 'name',)


class GameMixin:
    def to_representation(self, instance):
        data = super().to_representation(instance)

        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            raw_charts = getattr(instance, 'charts', None) or {}
            if type(raw_charts) is str:
                raw_charts = json.loads(raw_charts) or {}
            if self.context.get('raw_charts'):
                data['raw_charts'] = raw_charts.copy()
            released_chart = raw_charts.get('released')
            if released_chart and released_chart['year'] == instance.released.year and \
                    released_chart['year'] != models.Game._meta.get_field('released').default.year:
                data['charts'] = {'year': released_chart}
                data['charts']['year']['position'] += 1
            else:
                data['charts'] = {'year': None}

        data['short_screenshots'] = data['screenshots']
        del data['screenshots']

        if self.context.get('seo_short_description'):
            lang = self.context['request'].LANGUAGE_CODE
            data['short_description'] = find(instance.game_seo_fields_json, f'similar_games.{lang}.description', '')

        if self.context.get('games_add_field'):
            data[self.context['games_add_field']] = getattr(instance, self.context['games_add_field'])

        return data


class GameSearchMixin:
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['added_by_status'] = json.loads(data['added_by_status']) if data['added_by_status'] else None
        data['ratings'] = json.loads(data['ratings']) if data['ratings'] else None
        data['charts'] = json.loads(instance.charts) if getattr(instance, 'charts', None) else None
        if not self.context['request'].API_CLIENT_IS_WEBSITE:
            del data['charts']
        data['screenshots'] = json.loads(data['screenshots_json']) if data['screenshots_json'] else None
        api_group = self.context['request'].API_GROUP
        if api_group and api_group == settings.API_GROUP_FREE:
            data['clip'] = None
        else:
            data['clip'] = json.loads(data['clip_json']) if data['clip_json'] else None
        data['tags'] = json.loads(data['tags_json']) if data['tags_json'] else None
        data['esrb_rating'] = json.loads(data['esrb_rating_json']) if data['esrb_rating_json'] else None
        del data['screenshots_json'], data['clip_json'], data['tags_json'], data['esrb_rating_json']
        return data


game_swagger_schema_fields = {
    'properties': {
        'esrb_rating': {
            'type': openapi.TYPE_OBJECT,
            'properties': {
                'id': openapi.Schema(type=openapi.TYPE_INTEGER),
                'slug': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    enum=['everyone', 'everyone-10-plus', 'teen', 'mature', 'adults-only', 'rating-pending'],
                ),
                'name': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    enum=['Everyone', 'Everyone 10+', 'Teen', 'Mature', 'Adults Only', 'Rating Pending'],
                ),
            },
            'x-nullable': True,
        },
        'platforms': openapi.Schema(
            type=openapi.TYPE_ARRAY,
            items=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'platform': openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            'id': openapi.Schema(type=openapi.TYPE_INTEGER),
                            'slug': openapi.Schema(type=openapi.TYPE_STRING),
                            'name': openapi.Schema(type=openapi.TYPE_STRING),
                        },
                    ),
                    'released_at': {
                        'type': openapi.TYPE_STRING,
                        'x-nullable': True,
                    },
                    'requirements': {
                        'type': openapi.TYPE_OBJECT,
                        'properties': {
                            'minimum': openapi.Schema(type=openapi.TYPE_STRING),
                            'recommended': openapi.Schema(type=openapi.TYPE_STRING),
                        },
                        'x-nullable': True,
                    },
                },
            )
        ),
    },
}


class GameSearchSerializer(
    GameMixin, SearchMixin, GameSerializerMixin, GameSearchMixin, HaystackSerializer
):
    id = serializers.CharField()
    rating = serializers.IntegerField()
    score = serializers.CharField()
    can_play = serializers.BooleanField(source='is_playable')

    class Meta:
        index_classes = [search_indexes.GameIndex]
        fields = (
            'id', 'slug', 'name', 'released', 'tba', 'background_image', 'rating', 'rating_top', 'ratings',
            'ratings_count', 'reviews_text_count', 'added', 'added_by_status', 'platforms', 'score', 'playtime',
            'metacritic', 'genres_ids', 'stores', 'screenshots_json', 'tags_json', 'esrb_rating_json', 'clip_json',
            'suggestions_count', 'updated', 'can_play', 'description_short'
        )
        swagger_schema_fields = game_swagger_schema_fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['rating'] = float(str(instance.rating / Decimal('100')))
        self.convert_ids_to_objects(
            data,
            (
                ('platforms', 'platform', PlatformParentSerializer),
                ('stores', 'store', False),
            ),
            False,
        )
        self.convert_ids_to_objects(
            data,
            (
                ('genres_ids', 'genre', False),
            ),
            True,
        )
        self.translate_fields(data, instance, 'name')
        return data

    @cached_property
    def all_platforms(self):
        return PlatformList().get()

    @cached_property
    def all_stores(self):
        return StoreList().get()

    @property
    def all_genres(self):
        lang = self.context['request'].LANGUAGE_CODE_ISO3
        if not getattr(self, '_genres', None):
            self._genres = {}
        data = self._genres.get(lang)
        if data:
            return data
        data = GenreList().get(language=lang)
        self._genres[lang] = data
        return data

    @staticmethod
    def _get_default_field_kwargs(model, field):
        field_name = field.model_attr or field.index_fieldname
        if field_name == 'rating':
            return {'prefix_field_names': False, 'read_only': True}
        return SearchMixin._get_default_field_kwargs(model, field)


class GameSerializer(
    GameMixin, GameJSONSerializerMixin, GameSerializerMixin, serializers.ModelSerializer
):
    background_image = serializers.ImageField()
    rating = serializers.FloatField()
    can_play = serializers.BooleanField(source='is_playable')
    plays = serializers.IntegerField(read_only=True)
    promo = serializers.SerializerMethodField()

    class Meta(GameShortSerializer.Meta):
        model = models.Game
        fields = [
            'id', 'slug', 'name', 'released', 'tba', 'background_image', 'rating', 'rating_top', 'ratings',
            'ratings_count', 'reviews_text_count', 'added', 'added_by_status', 'metacritic', 'playtime',
            'suggestions_count', 'updated', 'can_play', 'plays', 'promo', 'description_short'
        ]
        read_only_fields = fields
        json_fields = (
            'platforms_json', 'parent_platforms_json', 'genres_json', 'stores_json',
            'screenshots_json', 'clip_json', 'tags_json', 'esrb_rating_json',
        )
        swagger_schema_fields = game_swagger_schema_fields

    def get_promo(self, obj):
        return bool(obj.promo) and obj.promo == settings.GAMES_PROMO

class UserGameNewCardSerializer(GameSerializer):
    is_new = serializers.BooleanField()
    hide_small_top_rating = False

    class Meta(GameSerializer.Meta):
        fields = GameSerializer.Meta.fields + ['is_new']
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # update platforms
        if data.get('platforms'):
            parents = {}
            for p in instance.platforms_json:
                parent = self.parent_platforms_by_platform.get(p['platform']['id'])
                if not parent:
                    continue
                parents[parent.id] = parent
            selected = []
            if 'users_selected_platforms' in self.context:
                selected = (self.context.get('users_selected_platforms') or {}).get(data['id']) or []
                # add platforms which user added, but they are not in the game
                for platform_id in selected:
                    if platform_id not in parents.keys():
                        parents[platform_id] = self.parent_platforms[platform_id]
            platforms = PlatformParentSerializer(sorted(list(parents.values()), key=lambda x: x.order), many=True).data
            data['parent_platforms'] = [
                {'platform': platform, 'selected': platform['id'] in selected}
                for platform in platforms
            ]
        return data

    @cached_property
    def parent_platforms_by_platform(self):
        return PlatformParentListByPlatform().get()

    @cached_property
    def parent_platforms(self):
        return PlatformParentList().get()


class CollectionGameSerializer(serializers.ModelSerializer):
    games = serializers.ListField(required=False)

    def get_collection_id(self):
        return self.context['view'].kwargs.get('collection_pk')

    def create(self, validated_data):
        game_offers = []
        objects = []
        for game_id in validated_data.get('games'):
            game = get_object_or_none(models.Game.objects.all(), id=game_id)
            if not game:
                continue
            exist = get_object_or_none(self.Meta.model.objects, game=game, collection=self.context['view'].collection)
            obj = None
            if not exist:
                obj = self.Meta.model()
                obj.game = game
                obj.collection = self.context['view'].collection
            game_offer = get_object_or_none(
                models.CollectionOffer.objects.all(), game=game,
                collection=self.context['view'].collection,
            )
            if game_offer:
                game_offer.initial_hidden = None
                game_offer.hidden = True
                game_offers.append(game_offer)
                if obj:
                    obj.add_user_feed = game_offer.creator_id
            if obj:
                objects.append(obj)
        try:
            with transaction.atomic():
                for game_offer in game_offers:
                    game_offer.save()
                for obj in objects:
                    obj.save()
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
        return {
            'games': validated_data.get('games'),
        }

    def bulk_patch(self):
        self.Meta.model.objects.filter(collection=self.context['view'].collection).delete()
        for game_id in self.validated_data.get('games'):
            game = get_object_or_none(models.Game.objects.all(), id=game_id)
            if not game:
                continue
            self.Meta.model.objects.get_or_create(game=game, collection=self.context['view'].collection)
        return {
            'games': self.validated_data.get('games'),
        }

    def bulk_destroy(self):
        self.Meta.model.objects.filter(
            collection=self.context['view'].collection,
            game_id__in=self.validated_data.get('games'),
        ).delete()

    class Meta:
        model = models.CollectionGame
        fields = ('games',)
        swagger_schema_fields = {
            'example': {
                'games': [123, 234],
            },
            'properties': {
                'games': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Items(type=openapi.TYPE_INTEGER),
                    description='List of game ids.',
                )
            },
        }


class CollectionFeedSerializer(serializers.ModelSerializer):
    show_related = True

    def to_representation(self, instance):
        from api.reviews.serializers import (
            ReviewCollectionSerializer, CommentFeedSerializer as ReviewCommentSerializer
        )
        from api.discussions.serializers import (
            DiscussionCollectionSerializer, CommentFeedSerializer as DiscussionCommentSerializer
        )

        data = super().to_representation(instance)
        if data.get('text'):
            data['text'] = instance.text_safe
        if not self.show_related:
            return data

        # game
        collections_games = self.context.get('collections_games')
        if instance.content_type.natural_key() == ('games', 'collectiongame'):
            data['type'] = 'game'
            if collections_games:
                game = collections_games.get(instance.object_id)
                if game:
                    data['game'] = GameSerializer(game, context=self.context).data
        # review
        self.to_representation_element(
            'collections_reviews', 'review', instance,
            (('reviews', 'review'), ('comments', 'commentreview')),
            ReviewCollectionSerializer, ReviewCommentSerializer, data,
        )
        # discussion
        self.to_representation_element(
            'collections_discussions', 'discussion', instance,
            (('discussions', 'discussion'), ('comments', 'commentdiscussion')),
            DiscussionCollectionSerializer, DiscussionCommentSerializer, data,
        )
        # user
        data['user'] = None
        collections_users = self.context.get('collections_global_users') or {}
        user = collections_users.get(instance.user_id)
        if user:
            data['user'] = UserSerializer(user, context=self.context).data

        # comments
        if 'collection_feeds_comments' in self.context:
            comments = []
            comments_last = instance.comments_last or {}
            for pk in comments_last.get('comments') or []:
                comment = self.context['collection_feeds_comments'].get(pk)
                if comment:
                    comments.append(comment)
            total = comments_last.get('total') or 0
            on_page = comments_last.get('on_page') or 0
            data['comments'] = {
                'count': total,
                'next': None,
                'previous': None,
                'results': CollectionFeedCommentSerializer(comments, context=self.context, many=True).data,
            }
            if total > on_page:
                url = reverse('api:commentcollectionfeed-list', args=[instance.collection_id, instance.id])
                data['comments']['next'] = '{}?page=2'.format(url)

        return data

    def to_representation_element(self, elements, el, instance, model_labels, serializer, comment_serializer, data):
        items = self.context.get(elements) or {}
        comments = self.context.get('{}_comments'.format(elements)) or {}
        if instance.content_type.natural_key() in model_labels:
            item = items.get(instance.object_id)
            data['type'] = el
            if instance.content_type.natural_key() == model_labels[1]:
                data['type'] = '{}_comment'.format(el)
                comment = comments.get(instance.object_id)
                if comment:
                    data['comment'] = comment_serializer(comment, context=self.context).data
                    item = items.get(data['comment']['object_id'])
            if item:
                data[el] = serializer(item, context=self.context).data

    class Meta:
        model = models.CollectionFeed
        fields = (
            'id', 'created', 'text', 'text_preview', 'text_previews', 'text_attachments', 'comments_count',
            'comments_parent_count',
        )
        read_only_fields = fields


class CollectionFeedEditSerializer(CollectionFeedSerializer):
    game = serializers.IntegerField(required=False)
    review = serializers.IntegerField(required=False)
    discussion = serializers.IntegerField(required=False)
    comment = serializers.IntegerField(required=False)
    user = UserSerializer(read_only=True)
    show_related = False

    def get_extra_kwargs(self):
        extra_kwargs = super().get_extra_kwargs()
        if self.context.get('view') and self.context['view'].action != 'create':
            kwargs = extra_kwargs.get('game', {})
            kwargs['read_only'] = True
            extra_kwargs['game'] = kwargs
        return extra_kwargs

    def create(self, validated_data):
        validated_data['collection'] = self.context['view'].collection

        if 'game' in validated_data:
            game_id = validated_data.pop('game')
            is_exist = models.CollectionGame.objects.filter(
                game_id=game_id,
                collection=self.context['view'].collection,
            ).count()
            if is_exist:
                raise serializers.ValidationError({'game': ['The game is already in this collection']})
            collection_game = models.CollectionGame()
            collection_game.skip_auto_feed = True
            collection_game.game_id = game_id
            collection_game.collection = validated_data['collection']
            collection_game.save()

            game_offer = get_object_or_none(
                models.CollectionOffer.objects.all(), game_id=game_id,
                collection=self.context['view'].collection,
            )
            if game_offer:
                game_offer.initial_hidden = None
                game_offer.hidden = True
                game_offer.save()
                validated_data['user_id'] = game_offer.creator_id

            validated_data['content_type'] = CommonContentType().get(collection_game)
            validated_data['object_id'] = collection_game.id
        elif 'review' in validated_data:
            self.create_element(validated_data, 'review', Review, CommentReview)
        elif 'discussion' in validated_data:
            self.create_element(validated_data, 'discussion', Discussion, CommentDiscussion)
        else:
            raise serializers.ValidationError({'game': ['Please set a game, review or discussion field']})

        instance = super().create(validated_data)
        return instance

    def create_element(self, validated_data, el, model, model_comment):
        object_id = validated_data.pop(el)
        if 'comment' in validated_data:
            comment_id = validated_data.pop('comment')
            content_type = CommonContentType().get(model_comment)
            is_exist = models.CollectionFeed.objects.filter(
                content_type=content_type, object_id=comment_id,
                collection=self.context['view'].collection,
            ).count()
            if is_exist:
                raise serializers.ValidationError({'game': ['The comment is already in this collection']})
            validated_data['content_type'] = content_type
            validated_data['object_id'] = comment_id
        else:
            content_type = CommonContentType().get(model)
            is_exist = models.CollectionFeed.objects.filter(
                content_type=content_type, object_id=object_id,
                collection=self.context['view'].collection,
            ).count()
            if is_exist:
                raise serializers.ValidationError({'game': ['The {} is already in this collection'.format(el)]})
            validated_data['content_type'] = content_type
            validated_data['object_id'] = object_id

    class Meta(CollectionFeedSerializer.Meta):
        fields = CollectionFeedSerializer.Meta.fields + (
            'game', 'review', 'discussion', 'comment', 'user',
        )
        read_only_fields = (
            'id', 'created', 'text_preview', 'text_previews', 'text_attachments', 'comments_count',
            'comments_parent_count',
        )


class CollectionFeedCommentSerializer(BaseCommentSerializer):
    class Meta(BaseCommentSerializer.Meta):
        model = CommentCollectionFeed


class CollectionFeedCommentFeedSerializer(BaseCommentSerializer):
    class Meta(BaseCommentSerializer.MetaFeed):
        model = CommentCollectionFeed


class CollectionFeedCommentLikeSerializer(BaseLikeSerializer):
    class Meta(BaseLikeSerializer.Meta):
        model = LikeCollectionFeed


class CollectionOfferSerializer(CollectionGameSerializer):
    def validate_games(self, value):
        if self.context['view'].action in ('create', 'bulk_delete'):
            for game_id in value:
                game = get_object_or_none(models.Game.objects.all(), id=game_id)
                if not game:
                    continue
                game_offer = get_object_or_none(
                    self.Meta.model.objects.all(), game=game,
                    collection=self.context['view'].collection,
                )
                if self.context['view'].action == 'create' and game_offer and game_offer.hidden:
                    game_offer.delete()
        return value

    def create(self, validated_data):
        for game_id in self.validated_data.get('games'):
            game = get_object_or_none(models.Game.objects.all(), id=game_id)
            if not game:
                continue
            self.Meta.model.objects.get_or_create(
                game=game, collection=self.context['view'].collection,
                defaults={'creator': self.context['request'].user},
            )
        return {
            'games': self.validated_data.get('games'),
        }

    def destroy(self, collection_offer):
        if collection_offer.creator == self.context['request'].user:
            collection_offer.delete()
        else:
            collection_offer.initial_hidden = None
            collection_offer.hidden = True
            collection_offer.save()

    def bulk_destroy(self):
        for game_id in self.validated_data.get('games'):
            collection_offer = get_object_or_none(
                self.Meta.model.objects, game_id=game_id,
                collection=self.context['view'].collection,
            )
            if collection_offer:
                self.destroy(collection_offer)

    class Meta:
        model = models.CollectionOffer
        fields = ('games',)
        swagger_schema_fields = {
            'example': {
                'games': [123, 234],
            },
            'properties': {
                'games': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Items(type=openapi.TYPE_INTEGER),
                    description='List of game ids.',
                )
            },
        }


class CollectionSerializer(RetryCreateMixin, DiscoverySubscriptionMixin, serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)

    def create(self, validated_data):
        validated_data['creator'] = self.context['request'].user
        return super().create(validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if data.get('description'):
            data['description_raw'] = data['description']
            data['description'] = linebreaksbr(urlize(data['description']))

        if not data.get('backgrounds'):
            data['backgrounds'] = []
        if data['backgrounds']:
            data['game_background'] = data['backgrounds'][0]
        elif instance.game_background_id:
            data['game_background'] = {
                'dominant_color': '0f0f0f',
                'saturated_color': '0f0f0f',
                'url': instance.game_background.background_image_full,
            }
            if not data.get('backgrounds'):
                data['backgrounds'] = [data['game_background']]
        data['game_covers'] = data['backgrounds'][0 if len(data['backgrounds']) < 4 else 1:]

        if 'games_in_collections' in self.context:
            data['user_games'] = self.context['games_in_collections'].get(instance.id)

        if 'collections_users_likes' in self.context:
            data['user_like'] = self.context['collections_users_likes'].get(instance.id) or 0

        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            if 'following_collections' in self.context:
                following = self.context.get('following_collections')
                data['following'] = bool(following)
                if type(following) is dict:
                    data['following'] = following.get(instance.id) or False

            data['followers_count'] = instance.followers_count
            data['promo'] = instance.promo

        return data

    class Meta:
        model = models.Collection
        fields = (
            'id', 'slug', 'name', 'noindex', 'description', 'creator', 'created', 'updated',
            'game_background', 'backgrounds', 'games_count', 'posts_count', 'likes_count', 'likes_users',
            'likes_positive', 'likes_rating',  # todo outdated
            'share_image', 'language', 'is_private',
        )
        read_only_fields = (
            'id', 'slug', 'noindex', 'creator', 'created', 'updated', 'backgrounds', 'games_count',
            'posts_count', 'likes_count', 'likes_users',
            'likes_positive', 'likes_rating',  # todo outdated
            'share_image', 'language',
        )


class CollectionListSerializer(CollectionSerializer):
    class Meta(CollectionSerializer.Meta):
        model = models.Collection
        fields = (
            'id', 'slug', 'name', 'noindex', 'creator', 'game_background', 'backgrounds', 'games_count'
        )
        read_only_fields = (
            'id', 'slug', 'noindex', 'creator', 'backgrounds', 'games_count'
        )


class CollectionShortSerializer(CollectionSerializer):
    class Meta(CollectionSerializer.Meta):
        fields = (
            'id', 'slug', 'name',
        )
        read_only_fields = fields


class CollectionShortImageSerializer(CollectionSerializer):
    class Meta(CollectionSerializer.Meta):
        fields = (
            'id', 'slug', 'name', 'game_background', 'backgrounds',
        )
        read_only_fields = fields


class CollectionByGameSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['game_in_collection'] = False
        game_collections = self.context.get('game_collections')
        if game_collections:
            data['game_in_collection'] = instance.id in list(game_collections)
        return data

    class Meta:
        model = models.Collection
        fields = ('id', 'slug', 'name')
        read_only_fields = fields


class CollectionByItemSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['item_in_collection'] = False
        item_collections = self.context.get('item_collections')
        if item_collections:
            data['item_in_collection'] = instance.id in list(item_collections)
        return data

    class Meta:
        model = models.Collection
        fields = ('id', 'slug', 'name')
        read_only_fields = fields


class CollectionSearchSerializer(SearchMixin, HaystackSerializer):
    id = serializers.CharField()
    score = serializers.CharField()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = clear_id(data['id'])
        if data['backgrounds']:
            data['backgrounds'] = json.loads(data['backgrounds'])
            data['game_background'] = data['backgrounds'][0]
        else:
            data['backgrounds'] = []
            data['game_background'] = None
        data['game_covers'] = data['backgrounds'][0 if len(data['backgrounds']) < 4 else 1:]
        creator = (self.context.get('collections_creators') or {}).get(instance.creator_id)
        if creator:
            data['creator'] = UserSerializer(creator, context=self.context).data
        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            data['promo'] = instance.promo
        return data

    class Meta:
        index_classes = [search_indexes.CollectionIndex]
        fields = ('id', 'slug', 'name', 'noindex', 'backgrounds', 'games_count', 'score')


class CollectionLikeSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    positive = serializers.BooleanField(default=True)  # todo outdated

    def create(self, validated_data):
        validated_data['collection_id'] = self.context['view'].collection.id
        try:
            return super().create(validated_data)
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
            instance = get_object_or_404(
                models.CollectionLike.objects.all(),
                collection_id=validated_data['collection_id'],
                user=validated_data['user'],
            )
            validated_data['count'] = validated_data.get('count', 1)
            return super().update(instance, validated_data)

    class Meta:
        model = models.CollectionLike
        fields = ('id', 'user', 'positive', 'count')
        read_only_fields = ('id', 'user')


class GamePlatformMetacriticSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        platforms_all = PlatformList().get()
        try:
            data['platform'] = {
                'platform': platforms_all[instance.platform_id].id,
                'name': platforms_all[instance.platform_id].name,
                'slug': platforms_all[instance.platform_id].slug,
            }
        except KeyError:
            data['platform'] = None
        return data

    class Meta:
        model = models.GamePlatformMetacritic
        fields = ('metascore', 'url')
        read_only_fields = fields


class GameSingleSerializer(GameJSONSerializerMixin, GameSerializerMixin, serializers.ModelSerializer):
    name_original = serializers.CharField(source='name_en', read_only=True)
    creators_count = serializers.IntegerField(source='persons_count', read_only=True)
    metacritic_platforms = GamePlatformMetacriticSerializer(
        source='gameplatformmetacritic_set', read_only=True, many=True
    )
    background_image = serializers.ImageField()
    rating = serializers.FloatField()
    iframe_url = serializers.SerializerMethodField()
    desktop_auth_delay = serializers.IntegerField(read_only=True)
    mobile_auth_delay = serializers.IntegerField(read_only=True)
    play_on_desktop = serializers.BooleanField(read_only=True)
    play_on_mobile = serializers.BooleanField(read_only=True)
    seamless_auth = serializers.BooleanField(read_only=True)
    alternative_fullscreen = serializers.BooleanField(read_only=True)
    image = serializers.FileField(read_only=True)
    short_platforms = False
    plays = serializers.IntegerField(read_only=True)
    exit_button_position = serializers.ListField(source='get_exit_button_position', read_only=True)

    class Meta:
        model = models.Game
        fields = (
            'id', 'slug', 'name', 'name_original', 'description', 'metacritic', 'metacritic_platforms',
            'released', 'tba', 'updated', 'background_image', 'background_image_additional', 'website', 'rating',
            'rating_top', 'ratings', 'reactions', 'added', 'added_by_status', 'playtime', 'screenshots_count',
            'movies_count', 'creators_count', 'achievements_count', 'parent_achievements_count',
            'reddit_url', 'reddit_name', 'reddit_description', 'reddit_logo', 'reddit_count', 'twitch_count',
            'youtube_count', 'reviews_text_count', 'ratings_count', 'suggestions_count',
            'alternative_names', 'metacritic_url', 'parents_count', 'additions_count', 'game_series_count',
            'iframe_url', 'image', 'desktop_auth_delay', 'mobile_auth_delay', 'play_on_desktop', 'play_on_mobile',
            'plays', 'seamless_auth', 'alternative_fullscreen', 'description_short', 'exit_button_position'
        )
        read_only_fields = fields
        json_fields = [
            'parent_platforms_json', 'platforms_json', 'stores_json', 'developers_json',
            'genres_json', 'tags_json', 'publishers_json', 'esrb_rating_json', 'clip_json',
        ]
        swagger_schema_fields = game_swagger_schema_fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context['request']

        game = game_mapper.reader_plain(instance)
        data['reviews_text_count'] = ShowCounters.service.reviews_text_count(game=game, request=request)
        data['parent_achievements_count'] = ShowCounters.service.parent_achievements_count(game=game, request=request)
        data['reddit_count'] = ShowReddit.service.count(count=data['reddit_count'], request=request)

        if instance.tba:
            data['released'] = None

        is_plain_text = getattr(instance, f'description_{self.context["request"].LANGUAGE_CODE}_is_plain_text')
        if not is_plain_text:
            data['description_raw'] = get_plain_text(br_to_new_line(instance.description))
        else:
            data['description_raw'] = instance.description
        hide_description(instance, data)
        if not data['description']:
            public_auto_text = ''
            auto_text = find(
                instance.game_seo_fields_json,
                f'similar_games.{self.context["request"].LANGUAGE_CODE}.description',
                ''
            )
            if not request.API_CLIENT_IS_WEBSITE or request.API_CLIENT == 'txt':
                public_auto_text = find(
                    instance.game_seo_fields_json,
                    f'similar_games.{self.context["request"].LANGUAGE_CODE}.description_public',
                    ''
                )
            data['description'] = linebreaks(public_auto_text or auto_text)
        else:
            data['description'] = seo.clean_text(
                data['description'], self.context['request'].LANGUAGE_CODE, is_plain_text
            )

        if request.API_CLIENT_IS_WEBSITE:
            data['description_is_protected'] = instance.description_is_protected
            data['collections_count'] = ShowCounters.service.collections_count(game=game, request=request)
            data['discussions_count'] = ShowCounters.service.discussions_count(game=game, request=request)
            data['imgur_count'] = instance.imgur_count
            data['files_count'] = instance.files_count

            if instance.charts and instance.genres_json:
                result = {}
                genre_chart = instance.charts.get('genre')
                if genre_chart:
                    available_genres = {genre['id']: genre['name'] for genre in instance.genres_json}
                    min_position = None
                    result_genre_id = None
                    result_change = 'new'
                    for genre_id, (position, change) in genre_chart.items():
                        if int(genre_id) not in available_genres.keys():
                            continue
                        if not min_position or position < min_position:
                            min_position = position
                            result_change = change
                            result_genre_id = int(genre_id)
                    if result_genre_id:
                        result['genre'] = {
                            'name': available_genres[result_genre_id],
                            'position': min_position + 1,
                            'change': result_change,
                        }
                released_chart = instance.charts.get('released')
                if released_chart and released_chart['year'] == instance.released.year and \
                        released_chart['year'] != models.Game._meta.get_field('released').default.year:
                    result['year'] = released_chart
                    result['year']['position'] += 1
                data['charts'] = result

            data.update(seo.game(instance, request))

            data['editorial_review'] = False
            if request.LANGUAGE_CODE == settings.LANGUAGE_RU and request.API_CLIENT != 'txt':
                try:
                    data['description'] = keep_tags(
                        EditorialReview.objects.only('text').get(game_id=data['id']).text
                    )
                    data['editorial_review'] = True
                except EditorialReview.DoesNotExist:
                    pass
        return data

    def get_iframe_url(self, obj):
        iframe_url = obj.get_iframe_display()
        if not iframe_url:
            return None
        controller = PlayerGameSessionController()
        player = PlayerBase.from_request(self.context['request'])
        player_data = controller.get_session(game=obj, player=player)
        game_sid = player_data.game_sid
        player_id = player_data.player.id.hex
        auth_key = controller.make_auth_key(player_data)
        parsed_iframe = list(urlparse(iframe_url))
        params = dict(parse_qsl(parsed_iframe[4]))
        params.update({
            'player_id': player_id,
            'game_sid': game_sid,
            'app_id': obj.pk,
            'auth_key': auth_key,
            'guest': str(not player.is_persistent).lower()
        })
        parsed_iframe[4] = urlencode(params)
        return urlunparse(parsed_iframe)


class TwitchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Twitch
        fields = (
            'id', 'external_id', 'name', 'description', 'created', 'published', 'thumbnail', 'view_count',
            'language',
        )
        read_only_fields = fields


class TwitchShortSerializer(TwitchSerializer):
    class Meta(TwitchSerializer.Meta):
        fields = (
            'id', 'external_id', 'name', 'created', 'published',
        )
        read_only_fields = fields


class YoutubeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Youtube
        fields = (
            'id', 'external_id', 'channel_id', 'channel_title', 'name', 'description', 'created',
            'view_count', 'comments_count', 'like_count', 'dislike_count', 'favorite_count', 'thumbnails',
        )
        read_only_fields = fields


class YoutubeShortSeralizer(YoutubeSerializer):
    class Meta(YoutubeSerializer.Meta):
        fields = (
            'id', 'external_id', 'channel_id', 'channel_title', 'name', 'created',
        )
        read_only_fields = fields


class ImgurSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['thumbnail'] = settings.IMGUR_THUMB_URL.format(instance.image_id)
        data['thumbnails'] = {
            'default': data['thumbnail'],
            'medium': settings.IMGUR_THUMB_MEDIUM_URL.format(instance.image_id),
        }
        return data

    class Meta:
        model = Imgur
        fields = (
            'id', 'external_id', 'name', 'description', 'created', 'image', 'url',
            'view_count', 'comments_count',
        )
        read_only_fields = fields


class ParentAchievementSerializer(serializers.ModelSerializer):
    image = serializers.ImageField()

    class Meta:
        model = Achievement
        fields = ('id', 'name', 'description', 'image', 'percent')
        read_only_fields = fields

    def to_representation(self, instance):
        instance.image_source = None
        instance.image = None
        achievement = self.context.get('achievements', {}).get(instance.id)
        if achievement:
            instance.image_source = achievement.image_source
            instance.image = achievement.image
            instance.description = achievement.description.strip()

        data = super().to_representation(instance)
        if not data['image'] and instance.image_source:
            data['image'] = instance.image_source
        return data


class AdditionSerializer(ReversionMixin, serializers.ModelSerializer):
    game = serializers.PrimaryKeyRelatedField(queryset=models.Game.objects.all(), write_only=True)

    class Meta:
        model = models.Addition
        fields = ('game', 'link_type')
        read_only_fields = ()
        extra_kwargs = {
            'game': {'help_text': 'Id from /api/games.'},
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['game'] = GameSerializer(instance.game, context=self.context).data
        return data

    def create(self, validated_data):
        validated_data['parent_game_id'] = self.context['view'].game_id
        return super().create(validated_data)


class GameSeriesSiblingSerializer(ReversionMixin, serializers.ModelSerializer):
    game = serializers.PrimaryKeyRelatedField(
        queryset=models.Game.objects.all(), write_only=True, help_text='Id from /api/games.'
    )

    class Meta:
        model = models.Game.game_series.through
        fields = ('game',)
        read_only_fields = ()
        swagger_schema_fields = {
            'example': {
                'game': 416,
            }
        }

    def perform_create(self, validated_data):
        try:
            self.context['view'].game.game_series.add(validated_data['game'].id)
            for game_id in validated_data['game'].game_series.values_list('id', flat=True):
                if game_id == self.context['view'].game.id:
                    continue
                self.context['view'].game.game_series.add(game_id)
            for game_id in self.context['view'].game.game_series.values_list('id', flat=True):
                if game_id == validated_data['game'].id:
                    continue
                validated_data['game'].game_series.add(game_id)
            return validated_data['game']
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
            raise serializers.ValidationError(self.create_error)


game_extra_kwargs = {
    'image': {'help_text': 'An image file with size up to 20 MB.'},
    'esrb_rating': {'help_text': 'Id from /api/ratings/esrb.'},
    'genres': {'help_text': 'List of ids from /api/genres.'},
    'developers': {'help_text': 'List of ids from /api/developers.'},
    'publishers': {'help_text': 'List of ids from /api/publishers.'},
    'website': {'help_text': 'URL.'},
}


class GameCreateSerializer(ReversionMixin, serializers.ModelSerializer):
    alternative_names = serializers.ListField(help_text='List of strings.')
    reddit_url = RedditField(required=False, help_text='URL of /r/Subreddit')
    metacritic_url = MetacriticField(required=False)
    name = serializers.CharField()
    create_error = {
        'name': ['The game with this name already exists.']
    }

    class Meta:
        model = models.Game
        fields = [
            'id', 'slug', 'name', 'image', 'alternative_names', 'description', 'esrb_rating',
            'platforms', 'genres', 'released', 'tba', 'developers', 'publishers',
            'website', 'reddit_url', 'metacritic_url',
        ]
        read_only_fields = ['id', 'slug']
        extra_kwargs = game_extra_kwargs

    def validate(self, data):
        errors = {}
        if not data.get('released') and not data.get('tba'):
            errors['released'] = 'Release Date or TBA is required'
            raise serializers.ValidationError(errors)
        return super().validate(data)

    def run_validation(self, data: QueryDict = empty):
        # TODO Add proper platforms validation
        if 'platforms' in data.keys():
            try:
                platforms = data.getlist('platforms')
            except AttributeError:
                platforms = data.get('platforms')
        else:
            platforms = []
        form_data = super().run_validation(data)
        form_data['platforms'] = platforms
        if form_data.get('description', None):
            form_data['description_en_is_plain_text'] = True

        if form_data.get('tba') and form_data.get('released'):
            form_data['released'] = date(year=1900, month=1, day=1)
        elif form_data.get('released'):
            form_data['tba'] = False

        return form_data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['genres'] = GenreSerializer(instance.genres, many=True).data
        data['platforms'] = PlatformSerializer(instance.platforms, many=True).data
        data['publishers'] = PublisherSerializer(instance.publishers, many=True).data
        data['developers'] = DeveloperSerializer(instance.developers, many=True).data
        data['esrb_rating'] = ESRBRatingSerializer(instance.esrb_rating).data
        data['description_raw'] = instance.description
        return data

    def create(self, validated_data):
        self.platforms = validated_data.pop('platforms')
        return super().create(validated_data)

    def create_action(self, instance, validated_data):
        if self.platforms:
            platforms = [] if self.platforms == [''] else self.platforms
            form_data = [
                int(platform) for platform in platforms
            ]
            self._perform_insert(instance, form_data, validated_data.get('released', None))
        update_game_json_field(instance.id, field_name=None, run_index_update=False)

    def _perform_insert(self, instance, platforms, released=None):
        for platform_id in platforms:
            models.GamePlatform.objects.create(
                game=instance,
                platform_id=platform_id,
                released_at=released,
            )


class GameUpdateSerializer(ReversionMixin, serializers.ModelSerializer):
    alternative_names = serializers.ListField(help_text='List of strings.')
    reddit_url = RedditField(required=False, help_text='URL of /r/Subreddit')
    metacritic_url = MetacriticField(required=False)
    tags = serializers.ReadOnlyField(help_text='List of strings.')

    class Meta:
        model = models.Game
        fields = [
            'id', 'slug', 'name', 'image', 'alternative_names', 'description', 'esrb_rating',
            'platforms', 'genres', 'released', 'tba', 'developers', 'publishers',
            'website', 'reddit_url', 'metacritic_url', 'tags',
        ]
        read_only_fields = ['id', 'slug']
        extra_kwargs = game_extra_kwargs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['genres'] = GenreSerializer(instance.genres.visible(), many=True).data
        data['platforms'] = PlatformSerializer(instance.platforms, many=True).data
        data['publishers'] = PublisherSerializer(instance.publishers.visible(), many=True).data
        data['developers'] = DeveloperSerializer(instance.developers.visible(), many=True).data
        tags = instance.tags.visible()

        if self.context and self.context['request'].LANGUAGE_CODE == settings.MODELTRANSLATION_DEFAULT_LANGUAGE:
            tags = tags.exclude(language__in=[
                lang for lang in settings.LANGUAGES_3_TO_2 if lang != settings.MODELTRANSLATION_DEFAULT_LANGUAGE_ISO3
            ])
        else:
            tags = tags.filter(language=self.context['request'].LANGUAGE_CODE_ISO3)
        data['tags'] = TagSerializer(tags, many=True).data
        data['esrb_rating'] = ESRBRatingSerializer(instance.esrb_rating).data
        if not getattr(instance, f'description_{self.context["request"].LANGUAGE_CODE}_is_plain_text'):
            data['description_raw'] = get_plain_text(br_to_new_line(instance.description))
        else:
            data['description_raw'] = instance.description
        return data

    def run_validation(self, data: QueryDict = empty):
        form_data = super().run_validation(data)
        user = self.context['request'].user
        if not user.is_staff:
            if form_data.get('name'):
                form_data.pop('name')
            if form_data.get('image'):
                form_data.pop('image')

        # TODO Add proper platforms validation
        if 'platforms' in data.keys():
            try:
                platforms = data.getlist('platforms')
            except AttributeError:
                platforms = data.get('platforms')
        else:
            platforms = []
        form_data['platforms'] = platforms

        if 'tags' in data.keys():
            form_data['tags'] = self._prepare_tags(
                data, self.context['view'].get_object(), self.context['request'].LANGUAGE_CODE_ISO3
            )
        if form_data.get('description', None):
            form_data['description_en_is_plain_text'] = True
        if form_data.get('tba') and form_data.get('released'):
            form_data['released'] = date(year=1900, month=1, day=1)
        elif form_data.get('released'):
            form_data['tba'] = False

        return form_data

    def update(self, instance, validated_data):
        self.platforms = validated_data.pop('platforms')
        return super().update(instance, validated_data)

    def update_action(self, instance, validated_data):
        if self.platforms:
            # TODO Add proper platforms validation
            platforms = [] if self.platforms == [''] else self.platforms
            instance_data = models.GamePlatform.objects.filter(
                game_id=instance.id,
            ).values_list('platform_id', flat=True)
            form_data = [
                int(platform) for platform in platforms
            ]
            to_insert, to_update, to_delete = self._prepare_update_data(instance_data, form_data)
            self._perform_insert(to_insert, validated_data.get('released', None))
            self._perform_update(to_update, validated_data.get('released', None))
            if self.context and self.context['request'].user.is_staff:
                self._perform_delete(to_delete)
        update_game_json_field(instance.id, field_name=None, run_index_update=False)

    def _prepare_update_data(self, instance_data, form_data):
        to_insert, to_update, to_delete = [], [], []

        for item in form_data:
            if item not in instance_data:
                to_insert.append(item)

        for item in form_data:
            if item in instance_data:
                to_update.append(item)

        for item in instance_data:
            if item not in form_data:
                to_delete.append(item)

        return to_insert, to_update, to_delete

    def _perform_insert(self, to_insert, released=None):
        if not to_insert:
            return

        for platform in to_insert:
            models.GamePlatform.objects.get_or_create(
                game_id=self.instance.id,
                platform_id=platform,
                released_at=released,
            )

    def _perform_update(self, to_update, released=None):
        if not to_update:
            return

        for platform_id in to_update:
            models.GamePlatform.objects.filter(
                game_id=self.instance.id,
                platform_id=platform_id,
            ).update(released_at=released)

    def _perform_delete(self, to_delete):
        if not to_delete:
            return

        for platform_id in to_delete:
            models.GamePlatform.objects.filter(game_id=self.instance.id, platform_id=platform_id).delete()

    def _prepare_tags(self, data, game, language):
        try:
            tags = data.getlist('tags')
        except AttributeError:
            tags = data.get('tags')
        tag_ids = []
        for tag in tags:
            if not tag:
                continue
            obj = models.Tag.find_by_synonyms(tag).first()
            if not obj:
                obj, _ = models.Tag.objects.get_or_create(name=tag.lower())
            tag_ids.append(obj.id)
        if self.context and self.context['request'].LANGUAGE_CODE == settings.MODELTRANSLATION_DEFAULT_LANGUAGE:
            included = [
                lang for lang in settings.LANGUAGES_3_TO_2 if lang != settings.MODELTRANSLATION_DEFAULT_LANGUAGE_ISO3
            ]
            for pk in game.tags.filter(language__in=included).values_list('id', flat=True):
                tag_ids.append(pk)
        else:
            for pk in game.tags.exclude(language=language).values_list('id', flat=True):
                tag_ids.append(pk)
        return tag_ids


class GameStoreCreateSerializer(ReversionMixin, serializers.ModelSerializer):
    game = GameShortSerializer(read_only=True)
    store = StoreSerializer(read_only=True, help_text='Id of a store from /api/stores.')
    url = serializers.URLField(help_text='URL for a Game in a specified Store.')
    create_error = {'store': ['This store for the game already exists.']}

    class Meta:
        model = models.GameStore
        fields = ('id', 'store', 'url', 'game')
        read_only_fields = ('id',)
        swagger_schema_fields = {
            'example': {
                'store_id': 1,
                'url': 'https://store.steampowered.com/app/268500/XCOM_2/',
            }
        }

    def run_validation(self, data: QueryDict = empty):
        form_data = deepcopy(data)
        validated_data = super().run_validation(form_data)
        validated_data['game'] = self.context['view'].game
        validated_data['store_id'] = form_data.get('store')
        return validated_data


class GameStoreEditSerializer(GameStoreCreateSerializer):
    class Meta(GameStoreCreateSerializer.Meta):
        # todo fields = ('id', 'url')
        # todo read_only_fields = ('id',)
        swagger_schema_fields = {
            'example': {
                'url': 'https://store.steampowered.com/app/268500/XCOM_2/',
            }
        }


class PlayerGameSessionSerializer(serializers.Serializer):
    data = serializers.FileField()

    def validate_data(self, value):
        if value.size > GamesConfig.SESSIONS_DATA_SIZE:
            raise serializers.ValidationError(f'Too big file, {GamesConfig.SESSIONS_DATA_SIZE} bytes is available')
        return value


class ParamsCheckSerializer(serializers.Serializer):
    app_id = serializers.IntegerField(min_value=1)
    auth_key = serializers.CharField()


class FeaturedSerializer(serializers.Serializer):
    description = serializers.CharField()
    image = serializers.ImageField()
    image_mobile = serializers.ImageField()
    name = serializers.CharField()
    slug = serializers.SlugField()


class SimpleGameSerializer(serializers.Serializer):
    name = serializers.CharField()
    image = serializers.ImageField()
    slug = serializers.SlugField()


class ListGamesMainQueryParamsSerializer(serializers.Serializer):
    play_on_desktop = serializers.BooleanField(required=False, allow_null=True, default=None)
    play_on_mobile = serializers.BooleanField(required=False, allow_null=True, default=None)


class MadWorldNewsSerializer(serializers.Serializer):
    subject = serializers.CharField()
    content = serializers.CharField()
    board = serializers.CharField()
    wr_id = serializers.CharField()


class GetOrCreatePlayerGameSessionSerializer(serializers.Serializer):
    game_id = serializers.IntegerField(write_only=True)
    player_id = serializers.UUIDField(format='hex')
    game_sid = serializers.CharField(read_only=True)
    username = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    def get_username(self, obj):
        return self.context['player'].username

    def get_avatar(self, obj):
        return self.context['player'].avatar

    def get_full_name(self, obj):
        return self.context['player'].full_name

    def validate_game_id(self, value):
        if not Client.objects.filter(game_id=value, client_id=self.context['request'].auth.get('client_id')).exists():
            raise PermissionDenied()
        return value

    def to_representation(self, instance):
        instance, _ = models.PlayerGameSession.objects.get_or_create(**instance)
        return super().to_representation(instance)
