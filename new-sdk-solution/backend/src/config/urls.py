from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from games import views as games_views
from payments import views as payments_views
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as game_serve

router = routers.DefaultRouter()
router.register(r'games', games_views.GameViewSet, basename='game')
router.register(r'payments', payments_views.PaymentViewSet, basename='payment')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/', include('users.urls')),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('games/<path:path>', game_serve, {'document_root': settings.GAMES_ROOT}),
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT) 