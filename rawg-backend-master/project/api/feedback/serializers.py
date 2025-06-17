from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.feedback import models
from apps.utils.tasks import send_email


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Feedback
        fields = ('id', 'email', 'name', 'text')
        read_only_fields = ('id',)

    def create(self, validated_data):
        validated_data['site'] = get_current_site(self.context['request'])
        instance = super().create(validated_data)
        send_email.delay(
            'feedback/email/feedback',
            {
                'text': instance.text,
                'email': instance.email,
                'site_name': instance.site.name if instance.site else None
            },
            [settings.FEEDBACK_EMAIL],
            language=self.context['request'].LANGUAGE_CODE
        )
        # send_slack.delay(
        #     instance.text,
        #     f'{user.username if user.is_authenticated else instance.email} '
        #     f'[{instance.site.name if instance.site else ""}]',
        #     ':bust_in_silhouette:',
        #     '#feedback'
        # )
        return instance


class FeedbackAuthSerializer(FeedbackSerializer):
    name = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)

    def validate(self, attrs):
        user = self.context['request'].user
        if user.is_authenticated and user.real_email:
            attrs['email'] = user.email
        if not attrs.get('email', '').strip():
            raise serializers.ValidationError({'email': _("Don't forget to add your email.")})
        if user.is_authenticated and user.full_name:
            attrs['name'] = user.full_name
        if not attrs.get('name', '').strip():
            raise serializers.ValidationError({'name': _("Don't forget to add your name.")})
        attrs['user_id'] = user.id
        return super().validate(attrs)
