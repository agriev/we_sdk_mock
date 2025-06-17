from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page as default_cache_page
from django.views.decorators.vary import vary_on_headers
from django_cache_dependencies.decorators import cache_page
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.banners.cache import BannersMedium
from apps.banners.models import Banner
from apps.utils.decorators import headers


class ActiveView(APIView):
    @method_decorator([
        headers({'X-Accel-Expires': 3600}),
        vary_on_headers('X-Api-Language', 'Host', 'Origin'),
        cache_page(3600, tags=lambda _: ('banners.active',)),
    ])
    def get(self, request, *args, **kwargs):
        banner = Banner.objects.filter(active=True).first()
        data = {'id': None}
        if banner and banner.text:
            data = {
                'id': banner.id,
                'text': banner.text,
                'url': banner.url,
                'url_text': banner.url_text,
            }
        return Response(data)


class MediumView(APIView):
    @method_decorator([
        vary_on_headers('X-Api-Language', 'Host', 'Origin'),
        headers({'X-Accel-Expires': 3600}),
        default_cache_page(3600),
    ])
    def get(self, request, *args, **kwargs):
        return Response(BannersMedium().get())
