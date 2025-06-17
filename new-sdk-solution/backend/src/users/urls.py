from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('anonymous/', views.AnonymousTokenView.as_view(), name='anonymous_token'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
] 