from django.db import IntegrityError
from psycopg2 import errorcodes
from rest_framework import serializers

from api.users.serializers import UserSerializer
from apps.feed import models
from apps.utils.api import int_or_number


class FeedSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    def to_representation(self, instance):
        return models.Feed.to_representation(super().to_representation(instance), instance, self.context)

    class Meta:
        model = models.Feed
        fields = ('id', 'user', 'action', 'created', 'reactions')
        read_only_fields = fields


class UserFeedSerializer(serializers.ModelSerializer):
    feed = FeedSerializer()

    def to_representation(self, instance):
        return models.UserFeed.to_representation(super().to_representation(instance), instance, self.context)

    class Meta:
        model = models.UserFeed
        fields = ('feed', 'new')
        read_only_fields = fields


class UserNotifyFeedSerializer(serializers.ModelSerializer):
    feed = FeedSerializer()

    def to_representation(self, instance):
        return models.UserNotifyFeed.to_representation(super().to_representation(instance), instance, self.context)

    class Meta:
        model = models.UserNotifyFeed
        fields = ('feed', 'new')
        read_only_fields = fields


class ReactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Reaction
        fields = ('id', 'name', 'slug')
        read_only_fields = fields
        ref_name = 'ReactionFeedSerializer'


class UserReactionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    def to_representation(self, instance):
        return super().to_representation(instance).get('user')

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['feed_id'] = int_or_number(self.context['view'].kwargs['feed_pk'])
        validated_data['reaction_id'] = int_or_number(self.context['view'].kwargs['reaction_pk'])
        try:
            return super().create(validated_data)
        except IntegrityError as e:
            if e.__cause__.pgcode == errorcodes.UNIQUE_VIOLATION:
                raise serializers.ValidationError({'reaction': ['This user has already added this reaction']})
            elif e.__cause__.pgcode == errorcodes.FOREIGN_KEY_VIOLATION:
                raise serializers.ValidationError({'error': ['Invalid parameters']})
            raise

    class Meta:
        model = models.UserReaction
        fields = ('id', 'user')
        read_only_fields = fields
