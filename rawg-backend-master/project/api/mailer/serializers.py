from rest_framework import serializers

from apps.users.models import User


class UnsubscribeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        subscription_fields = (
            'subscribe_mail_synchronization', 'subscribe_mail_reviews_invite', 'subscribe_mail_recommendations'
        )
        read_only_fields = ('id', 'username')
        fields = subscription_fields + read_only_fields
