from rest_framework import serializers

from api.users.serializers import UserSerializer
from apps.utils.dates import last_day_of_month


class ContributorsSerializer(serializers.Serializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        user = self.context['users'].get(instance['user'])
        if not user:
            return
        data['user'] = UserSerializer(user, context=self.context).data
        data['editing_count'] = instance['count']
        data['current'] = self.context['request'].user.is_authenticated and self.context['request'].user.id == user.id
        return data


class LeaderBoardSerializer(ContributorsSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['editing_count_per_day'] = round(
            instance['count'] / last_day_of_month(self.context['view'].year, self.context['view'].month), 1
        )
        if 'position' in instance:
            data['position'] = instance['position']
        return data
