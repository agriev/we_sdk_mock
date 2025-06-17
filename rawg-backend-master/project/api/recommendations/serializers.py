from django.db import IntegrityError
from rest_framework import serializers

from apps.recommendations import models


class UserRecommendationDislikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.UserRecommendationDislike
        fields = ('game',)
        read_only_fields = ()
        extra_kwargs = {
            'game': {'help_text': 'Id from /api/games/lists/main.'},
        }
        swagger_schema_fields = {
            'example': {
                'game': 123,
            }
        }

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        models.UserRecommendation.objects.visible().filter(
            game=validated_data['game'], user=validated_data['user']
        ).update(hidden=True, position=0)
        try:
            return super().create(validated_data)
        except IntegrityError:
            raise serializers.ValidationError({'game': ['The game is already disliked.']})
