from django.db import IntegrityError
from django.template.defaultfilters import linebreaksbr, urlize
from psycopg2 import errorcodes
from rest_framework import serializers

from api.serializers_mixins import CanDeleteMixin
from api.users.serializers import UserSerializer


class BaseCommentSerializer(CanDeleteMixin, serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('text'):
            data['text_raw'] = data['text']
            data['text'] = linebreaksbr(urlize(data['text']))

        name = '{}_{}_users_likes'.format(instance._meta.app_label, instance._meta.model_name)
        if name in self.context:
            data['user_like'] = instance.id in self.context[name]

        name = '{}_{}_users_posts'.format(instance._meta.app_label, instance._meta.model_name)
        if name in self.context:
            data['user_post'] = instance.id in self.context[name]

        collections_users = self.context.get('collections_global_users') or {}
        user = collections_users.get(instance.user_id)
        if user:
            data['user'] = UserSerializer(user, context=self.context).data

        data['can_delete'] = self.can_delete(instance)
        data['model'] = instance._meta.model_name.replace('comment', '')
        data['object_id'] = instance.object_id
        return data

    def get_extra_kwargs(self):
        extra_kwargs = super().get_extra_kwargs()
        if self.context.get('view') and self.context['view'].action != 'create':
            kwargs = extra_kwargs.get('parent', {})
            kwargs['read_only'] = True
            extra_kwargs['parent'] = kwargs
        return extra_kwargs

    def validate_parent(self, value):
        if value and value.parent_id:
            return value.parent
        return value

    def create(self, validated_data):
        validated_data['object_id'] = int(self.context['view'].kwargs['object_pk'])
        validated_data['user'] = self.context['request'].user
        parent = validated_data.get('parent')
        if parent and parent.object_id != validated_data['object_id']:
            raise serializers.ValidationError({'parent': ["The parent comment doesn't belong to this object_id"]})
        try:
            return super().create(validated_data)
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.FOREIGN_KEY_VIOLATION:
                raise
            raise serializers.ValidationError({'object_id': ['This object is not found']})

    class Meta:
        model = None
        fields = ('id', 'user', 'parent', 'text', 'created', 'edited', 'comments_count', 'likes_count', 'posts_count')
        read_only_fields = ('id', 'user', 'created', 'edited', 'comments_count', 'likes_count', 'posts_count')

    class MetaFeed:
        model = None
        fields = (
            'id', 'user_id', 'parent', 'text', 'created', 'edited', 'comments_count', 'likes_count', 'posts_count'
        )
        read_only_fields = ('id', 'user_id', 'created', 'edited', 'comments_count', 'likes_count', 'posts_count')


class BaseLikeSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    def create(self, validated_data):
        validated_data['comment_id'] = self.context['view'].kwargs['comment_pk']
        try:
            return super().create(validated_data)
        except IntegrityError as e:
            if e.__cause__.pgcode == errorcodes.UNIQUE_VIOLATION:
                raise serializers.ValidationError({'comment_id': ['This user has already liked this comment']})
            elif e.__cause__.pgcode == errorcodes.FOREIGN_KEY_VIOLATION:
                raise serializers.ValidationError({'error': ['Invalid parameters']})
            raise

    class Meta:
        model = None
        fields = ('id', 'user')
        read_only_fields = ('id', 'user')
