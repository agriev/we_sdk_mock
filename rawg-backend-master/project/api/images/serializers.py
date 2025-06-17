from rest_framework import serializers

from api.users.serializers import UserSerializer
from apps.images import models


class UserImageSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

    class Meta:
        model = models.UserImage
        fields = ('id', 'user', 'image', 'created')
        read_only_fields = ('id', 'user', 'created')
