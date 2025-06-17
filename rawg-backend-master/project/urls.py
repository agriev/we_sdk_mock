from django.conf import settings
from django.conf.urls import include
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from knbauth import FAKE

from api.schema import documentation_view, view

admin.site.site_header = 'AG'
admin.site.site_title = 'AG'
admin.site.index_title = 'Welcome to AG!'

urlpatterns = [
    path('api/', include('api.urls', namespace='api')),
    path('media/api/', include('api.urls_media', namespace='api_image')),
    path('houston/', admin.site.urls),
    path('stat/', include('apps.stat.urls', namespace='stat')),
    path('api-docs/', view('swagger'), name='api_docs'),
    path('docs/', documentation_view(), name='docs'),
    path('select2/', include('select2.urls')),
]


if FAKE:
    urlpatterns.append(
        path('accounts/', include('knbauth.urls'))
    )

if settings.DEBUG:
    import debug_toolbar
    urlpatterns += [
        path('__debug__/', include(debug_toolbar.urls))
    ] + static(
        settings.MEDIA_URL, document_root=settings.MEDIA_ROOT
    )
