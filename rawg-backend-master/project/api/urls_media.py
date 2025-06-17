from django.urls import path, register_converter

from api.images import views as images_view
from apps.common.rss import MailFeed, ZenFeed


class LanguageSuffixConverter:
    regex = r'(_\w{2})*'

    def to_python(self, value):
        return value

    def to_url(self, value):
        return value


register_converter(LanguageSuffixConverter, 'ls')
app_name = 'api_image'
urlpatterns = [
    path(
        'images/collections<ls:language_suffix>/<str:folder>/<str:hash>_<int:pk>.jpg',
        images_view.CollectionView.as_view(),
        name='collection'
    ),
    path(
        'images/discussions<ls:language_suffix>/<str:folder>/<str:hash>_<int:pk>.jpg',
        images_view.DiscussionsView.as_view(),
        name='discussion'
    ),
    path(
        'images/reviews<ls:language_suffix>/<str:folder>/<str:hash>_<int:pk>.jpg',
        images_view.ReviewView.as_view(),
        name='review'
    ),
    path(
        'images/users<ls:language_suffix>/<str:folder>/<str:hash>_<int:pk>.jpg',
        images_view.UserView.as_view(),
        name='user'
    ),
    path('images/resize', images_view.ResizeView.as_view(), name='resize'),
    path('zen.rss', ZenFeed(), name='zen'),
    path('mail.rss', MailFeed(), name='mail'),
]
