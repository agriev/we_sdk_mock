from rest_framework import serializers

from apps.utils.ganalytics import get_cid_from_cookie
from apps.utils.request import get_client_ip, get_user_agent


class CarouselRatingSerializer(serializers.Serializer):
    action = serializers.CharField(max_length=20)
    slug = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)

    def validate(self, attributes):
        request = self.context['request']
        attributes['user_id'] = request.user.id if request.user.is_authenticated else None
        attributes['slug'] = attributes.get('slug') or ''
        attributes['rating'] = attributes.get('rating') or None
        attributes['cid'] = get_cid_from_cookie(request.COOKIES.get('_ga'))
        attributes['ip'] = get_client_ip(request) or ''
        attributes['user_agent'] = get_user_agent(request)
        return attributes

    class Meta:
        swagger_schema_fields = {
            'example': {
                'action': 'skip',
                'slug': 'top-100',
                'rating': 4,
            }
        }


class StorySerializer(serializers.Serializer):
    second = serializers.IntegerField()
    domain = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)

    def validate(self, attributes):
        request = self.context['request']
        attributes['cid'] = get_cid_from_cookie(request.COOKIES.get('_ga'))
        attributes['second'] = attributes.get('second')
        attributes['domain'] = attributes.get('domain') or ''
        attributes['ip'] = get_client_ip(request) or ''
        attributes['user_agent'] = get_user_agent(request)
        return attributes

    class Meta:
        ref_name = 'StoryStat'
        swagger_schema_fields = {
            'example': {
                'second': 5,
                'domain': 'kanobu.ru',
            }
        }


class StoreVisitSerializer(serializers.Serializer):
    store_id = serializers.IntegerField()
    game_id = serializers.IntegerField()

    class Meta:
        swagger_schema_fields = {
            'example': {
                'store_id': 1,
                'game_id': 416,
            }
        }
