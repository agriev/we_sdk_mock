import re

from bs4 import BeautifulSoup
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.http import QueryDict
from psycopg2 import errorcodes
from rest_framework import serializers
from rest_framework.fields import empty
from rest_framework.generics import get_object_or_404

from api.comments.serializers import BaseCommentSerializer, BaseLikeSerializer
from api.games.serializers import GameSerializer, GameShortSerializer, GameStoreSerializer
from api.serializers_mixins import CanDeleteMixin
from api.users.serializers import UserSerializer
from apps.comments.models import CommentReview, LikeReview
from apps.common.cache import CommonContentType
from apps.games.models import Game
from apps.merger.models import MergedSlug
from apps.reviews import models
from apps.users.models import UserGame
from apps.users.tasks import add_games_to_library
from apps.utils.api import get_object_or_none
from apps.utils.exceptions import Found
from apps.utils.strings import get_int_from_string_or_none, keep_tags, remove_br


class ReactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Reaction
        fields = ('id', 'title', 'positive')
        read_only_fields = fields


class ReviewBaseSerializer(CanDeleteMixin, serializers.ModelSerializer):
    class Meta:
        model = models.Review
        fields = [
            'id', 'user', 'game', 'text', 'text_preview', 'text_previews', 'text_attachments', 'rating', 'reactions',
            'created', 'edited', 'likes_count', 'likes_positive', 'likes_rating', 'comments_count',
            'comments_parent_count', 'posts_count', 'is_text'
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('text'):
            data['text'] = instance.text_safe
        if 'reviews_users_likes' in self.context:
            data['user_like'] = False
            like = self.context['reviews_users_likes'].get(instance.id)
            if like is not None:
                data['user_like'] = 'positive' if like else 'negative'
        if 'reviews_review_users_posts' in self.context:
            data['user_post'] = instance.id in self.context['reviews_review_users_posts']
        if 'reviews_comments' in self.context:
            comments = []
            for pk in instance.get_attached_comments(self.context['request']):
                comment = self.context['reviews_comments'].get(pk)
                if comment:
                    comments.append(comment)
            data['comments'] = {
                'count': len(comments),
                'results': CommentSerializer(comments, context=self.context, many=True).data,
            }
        data['can_delete'] = self.can_delete(instance)
        return data


class ReviewSerializer(ReviewBaseSerializer):
    user = UserSerializer(read_only=True)
    add_to_library = serializers.BooleanField(read_only=True)
    external_avatar = serializers.ImageField(read_only=True)

    class Meta:
        model = models.Review
        fields = (
            'id', 'user', 'game', 'text', 'text_preview', 'text_previews', 'text_attachments', 'rating',
            'reactions', 'created', 'edited', 'likes_count', 'likes_positive', 'likes_rating', 'comments_count',
            'comments_parent_count', 'posts_count', 'share_image', 'add_to_library', 'is_text',
            'external_avatar',
        )
        read_only_fields = (
            'id', 'user', 'text_preview', 'text_previews',
            'text_attachments', 'created', 'edited', 'likes_count', 'likes_positive', 'likes_rating',
            'comments_count', 'comments_parent_count', 'posts_count', 'share_image',
            'add_to_library', 'is_text', 'external_avatar',
        )

    def run_validation(self, data: QueryDict = empty):
        valid_data = super().run_validation(data)
        valid_data['add_to_library'] = data.get('add_to_library', False)
        return valid_data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get('is_one_user'):
            del data['user']
        if self.context.get('request').user.is_authenticated and \
                self.context['view'].action in ('create', 'partial_update'):
            data['percent'] = self.context.get('request').user.get_rated_games_percent()
            if getattr(self, 'saved', None):
                if self.saved.get('rating_was'):
                    self.saved['game'].append_rating(self.saved['rating_was'], minus=True)
                if self.saved.get('rating'):
                    self.saved['game'].append_rating(self.saved['rating'])
                data['game'] = GameShortSerializer(self.saved['game'], context=self.context).data

        if not instance.user_id:
            game_store_data = GameStoreSerializer(instance.external_store)
            if game_store_data:
                data['external_store'] = game_store_data.data['store']
            data['external_lang'] = instance.external_lang
            data['external_author'] = instance.external_author.rstrip()
            data['external_source'] = instance.external_source
            data['is_external'] = True
        return data

    def get_extra_kwargs(self):
        extra_kwargs = super().get_extra_kwargs()
        if self.context.get('view') and self.context['view'].action != 'create':
            kwargs = extra_kwargs.get('game', {})
            kwargs['read_only'] = True
            extra_kwargs['game'] = kwargs
        return extra_kwargs

    def validate(self, attributes):
        if attributes.get('text') and not remove_br(attributes['text']).strip():
            raise serializers.ValidationError({
                'text': 'This field may not be blank.'
            })
        return attributes

    def create(self, validated_data):
        add_to_library = validated_data.pop('add_to_library')
        if not validated_data.get('user'):
            validated_data['user'] = self.context['request'].user
        old_record = get_object_or_none(
            self.Meta.model.objects.all(),
            hidden=True,
            user=validated_data['user'],
            game=validated_data['game']
        )
        if old_record:
            old_record.delete()

        try:
            with transaction.atomic():
                instance = super().create(validated_data)
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
            instance = self.Meta.model.objects.get(user=validated_data['user'], game=validated_data['game'])
            super().update(instance, validated_data)

        if add_to_library:
            add_games_to_library.delay(
                validated_data['user'].id,
                validated_data['game'].id
            )

        self.saved = {
            'game': validated_data['game'],
            'rating': validated_data['rating'],
        }
        return instance

    def update(self, instance, validated_data):
        self.saved = {'game': instance.game}
        if validated_data.get('rating'):
            self.saved['rating'] = validated_data['rating']
            self.saved['rating_was'] = instance.rating
        return super().update(instance, validated_data)


class ReviewFeedSerializer(ReviewBaseSerializer):
    reactions = ReactionSerializer(many=True)


class ReviewMainSerializer(ReviewBaseSerializer):
    reactions = ReactionSerializer(many=True)
    user = UserSerializer()
    game = GameShortSerializer()


class ReviewSingleMainSerializer(ReviewMainSerializer):
    class Meta(ReviewMainSerializer.Meta):
        fields = ReviewMainSerializer.Meta.fields + ['share_image']
        read_only_fields = fields


class ReviewShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Review
        fields = (
            'id', 'game', 'text',
        )
        read_only_fields = fields


class ReviewCollectionSerializer(ReviewBaseSerializer):
    class Meta(ReviewBaseSerializer.Meta):
        fields = ('id', 'text', 'text_preview', 'text_previews', 'text_attachments', 'rating',
                  'reactions', 'created', 'edited', 'likes_count', 'likes_positive', 'likes_rating', 'posts_count')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        collections_games = self.context.get('collections_global_games') or {}
        game = collections_games.get(instance.game_id)
        if game:
            data['game'] = GameShortSerializer(game, context=self.context).data
        collections_users = self.context.get('collections_global_users') or {}
        user = collections_users.get(instance.user_id)
        if user:
            data['user'] = UserSerializer(user, context=self.context).data
        return data


class ReviewVersusSerializer(ReviewBaseSerializer):
    reactions = ReactionSerializer(many=True)
    user = UserSerializer()

    class Meta(ReviewBaseSerializer.Meta):
        fields = (
            'id', 'user', 'text', 'text_preview', 'text_previews', 'text_attachments', 'rating', 'reactions',
            'created', 'edited', 'likes_count', 'likes_positive', 'likes_rating', 'comments_count',
            'comments_parent_count', 'posts_count', 'language'
        )
        read_only_fields = fields


class LikeSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    positive = serializers.BooleanField(default=True)

    class Meta:
        model = models.Like
        fields = ('id', 'user', 'positive')
        read_only_fields = ('id', 'user')

    def create(self, validated_data):
        validated_data['review_id'] = self.context['view'].kwargs['review_pk']
        try:
            return super().create(validated_data)
        except IntegrityError:
            instance = get_object_or_404(models.Like.objects.all(), review_id=validated_data['review_id'],
                                         user=validated_data['user'])
            return super().update(instance, validated_data)


class CommentSerializer(BaseCommentSerializer):
    class Meta(BaseCommentSerializer.Meta):
        model = CommentReview
        ref_name = 'CommentReview'


class CommentFeedSerializer(BaseCommentSerializer):
    class Meta(BaseCommentSerializer.MetaFeed):
        model = CommentReview


class CommentLikeSerializer(BaseLikeSerializer):
    class Meta(BaseLikeSerializer.Meta):
        model = LikeReview
        ref_name = 'LikeReview'


class VersusSerializer(serializers.ModelSerializer):
    game = GameShortSerializer()

    class Meta:
        model = models.Versus
        fields = ('id', 'game')
        read_only_fields = ('id', 'game')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        reviews = self.context.get('versus_reviews') or {}
        first = reviews.get(instance.review_first_id)
        second = reviews.get(instance.review_second_id)
        if first:
            data['review_first'] = ReviewVersusSerializer(first, context=self.context).data
        if second:
            data['review_second'] = ReviewVersusSerializer(second, context=self.context).data
        return data


class ReviewCarouselSerializer(serializers.ModelSerializer):
    game = GameSerializer()

    class Meta:
        model = UserGame
        fields = ('game',)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data = data['game']
        return data


class EditorialReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    text_ib_pattern = re.compile(r'&lt;%IB\(\d*\)%&gt;', re.I)

    class Meta:
        model = models.EditorialReview
        fields = ('id', 'user', 'game', 'text', 'rating', 'created')
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data['user']:
            data['user'] = UserSerializer(
                get_user_model().objects.get(slug='ag_editorial'), context=self.context
            ).data
            data['user']['username'] = instance.original_username
            data['user']['full_name'] = instance.display_name or instance.original_username
        data['text'] = self.filter_links(keep_tags(data['text'], ['h2', 'h3', 'a'], ['href']))
        data['text'] = self.text_ib_pattern.sub('', data['text'])
        return data

    def filter_links(self, text):
        soup = BeautifulSoup(text, 'html.parser')
        ids = set()
        links = {}
        for node in soup.findAll('a'):
            if not node.get('href'):
                node.unwrap()
                continue
            if node['href'].startswith('/geo/'):  # old ag.ru links
                pk = get_int_from_string_or_none(node['href'].strip('/').split('/').pop(), only_start=True)
                if pk:
                    ids.add(pk)
                    links[node['href']] = str(pk)
        slugs = {}
        if ids:
            slugs = dict(
                MergedSlug.objects.filter(old_slug__in=ids, content_type=CommonContentType().get(Game))
                .values_list('old_slug', 'new_slug')
            )
        for node in soup.findAll('a'):
            try:
                for protocol in ['http://', 'https://']:
                    for domain in ['ag.ru', 'www.ag.ru']:
                        if node['href'].startswith(protocol + domain + '/'):
                            node['href'] = node['href'].split(protocol + domain).pop()
                            raise Found
            except Found:
                continue
            if node['href'].startswith('/geo/'):
                slug = slugs.get(links.get(node['href']))
                if not slug:
                    node.unwrap()
                else:
                    node['href'] = f'/games/{slug}'
                continue
            node.unwrap()
        return str(soup)
