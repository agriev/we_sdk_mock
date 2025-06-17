from rest_framework import serializers

from api.comments.serializers import BaseCommentSerializer, BaseLikeSerializer
from api.games.serializers import GameShortSerializer
from api.serializers_mixins import CanDeleteMixin
from api.users.serializers import UserSerializer
from apps.comments.models import CommentDiscussion, LikeDiscussion
from apps.discussions import models
from apps.utils.strings import remove_br


class DiscussionBaseSerializer(CanDeleteMixin, serializers.ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('text'):
            data['text'] = instance.text_safe
        if 'discussions_discussion_users_posts' in self.context:
            data['user_post'] = instance.id in self.context['discussions_discussion_users_posts']
        if 'discussions_comments' in self.context:
            comments = []
            for pk in instance.get_attached_comments(self.context['request']):
                comment = self.context['discussions_comments'].get(pk)
                if comment:
                    comments.append(comment)
            data['comments'] = {
                'count': len(comments),
                'results': CommentSerializer(comments, context=self.context, many=True).data,
            }
        data['can_delete'] = self.can_delete(instance)
        return data

    class Meta:
        model = models.Discussion
        fields = ('id', 'user', 'game', 'title', 'text', 'text_preview', 'text_previews', 'text_attachments',
                  'created', 'edited')
        read_only_fields = fields


class DiscussionSerializer(DiscussionBaseSerializer):
    user = UserSerializer(read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get('is_one_game') and data.get('game'):
            data['game'] = GameShortSerializer(instance.game, context=self.context).data
        if self.context.get('is_one_user'):
            del data['user']
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
        validated_data['user'] = self.context['request'].user
        instance = super().create(validated_data)
        return instance

    class Meta:
        model = models.Discussion
        fields = (
            'id', 'user', 'game', 'title', 'text', 'text_preview', 'text_previews', 'text_attachments',
            'created', 'edited', 'comments_count', 'comments_parent_count', 'posts_count', 'share_image'
        )
        read_only_fields = (
            'id', 'user', 'text_preview', 'text_previews', 'text_attachments',
            'created', 'edited', 'comments_count', 'comments_parent_count', 'posts_count', 'share_image'
        )


class DiscussionFeedSerializer(DiscussionSerializer):
    class Meta(DiscussionSerializer.Meta):
        fields = (
            'id', 'user', 'title', 'text', 'text_preview', 'text_previews', 'text_attachments',
            'created', 'edited', 'comments_count', 'comments_parent_count', 'posts_count'
        )


class DiscussionShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Discussion
        fields = ('id', 'game', 'title', 'text', 'created')
        read_only_fields = fields


class DiscussionCollectionSerializer(DiscussionBaseSerializer):
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

    class Meta(DiscussionBaseSerializer.Meta):
        fields = ('id', 'title', 'text', 'text_preview', 'text_previews', 'text_attachments', 'created', 'edited',
                  'posts_count')


class CommentSerializer(BaseCommentSerializer):
    class Meta(BaseCommentSerializer.Meta):
        model = CommentDiscussion
        ref_name = 'CommentDiscussion'


class CommentFeedSerializer(BaseCommentSerializer):
    class Meta(BaseCommentSerializer.MetaFeed):
        model = CommentDiscussion


class CommentLikeSerializer(BaseLikeSerializer):
    class Meta(BaseLikeSerializer.Meta):
        model = LikeDiscussion
        ref_name = 'LikeDiscussion'
