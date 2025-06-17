from django.conf.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter, Route, escape_curly_brackets
from rest_framework_nested import routers

from api.ad import views as ad_views
from api.apk import views as apk_views
from api.banners import views as banners_views
from api.common import views as common_views
from api.credits import views as credits_views
from api.discussions import views as discussions_views
from api.feed import views as feed_views
from api.feedback.views import FeedbackViewSet
from api.files import views as files_views
from api.games import views as games_view
from api.images import views as images_view
from api.leaderboard import views as leaderboard_view
from api.mailer import views as mailer_view
from api.payments import views as payments_views
from api.pusher import views as pusher_view
from api.recommendations import views as recommendations_view
from api.reviews import views as reviews_view
from api.stat import views as stat_view
from api.stories import views as stories_view
from api.stripe import views as stripe_view
from api.suggestions import views as suggestions_view
from api.token import views as token_view
from api.users import views as users_views


def _get_dynamic_route(self, route, action):
    initkwargs = route.initkwargs.copy()
    initkwargs.update(action.kwargs)
    url_path = escape_curly_brackets(action.url_path)
    # https://github.com/encode/django-rest-framework/issues/6196#issuecomment-479618481
    if 'get' in action.mapping and 'head' not in action.mapping:
        action.mapping['head'] = action.mapping['get']
    return Route(
        url=route.url.replace('{url_path}', url_path),
        mapping=action.mapping,
        name=route.name.replace('{url_name}', action.url_name),
        detail=route.detail,
        initkwargs=initkwargs,
    )


kwargs = {'trailing_slash': False}
comments = r'comments'
DefaultRouter._get_dynamic_route = _get_dynamic_route
routers.NestedSimpleRouter.routes[0] = Route(
    url=r'^{prefix}{trailing_slash}$',
    mapping={
        'get': 'list',
        'head': 'list',
        'post': 'create',
        'patch': 'patch',
        'delete': 'delete',
    },
    name='{basename}-list',
    detail=False,
    initkwargs={'suffix': 'List'}
)
routers.NestedSimpleRouter.routes[2] = Route(
    url=r'^{prefix}/{lookup}{trailing_slash}$',
    mapping={
        'get': 'retrieve',
        'head': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    },
    name='{basename}-detail',
    detail=True,
    initkwargs={'suffix': 'Instance'}
)

router = DefaultRouter(**kwargs)
router.include_root_view = False
router.register(r'browse', common_views.ListView)
router.register(r'developers', games_view.DeveloperViewSet)
router.register(r'cheats', files_views.CheatCodeViewSet, base_name='cheats')
router.register(r'creators', credits_views.PersonViewSet)
router.register(r'demos', files_views.DemoViewSet, base_name='demos')
router.register(r'feedback', FeedbackViewSet)
router.register(r'games', games_view.GameViewSet, base_name='games')
router.register(r'genres', games_view.GenreViewSet)
router.register(r'images', images_view.UserImageViewSet)
router.register(r'leaderboard', leaderboard_view.LeaderBoardViewSet)
router.register(r'platforms', games_view.PlatformViewSet)
router.register(r'platforms/lists/parents', games_view.PlatformParentViewSet)
router.register(r'creator-roles', credits_views.PositionViewSet)
router.register(r'patches', files_views.PatchViewSet)
router.register(r'publishers', games_view.PublisherViewSet)
router.register(r'ratings/esrb', games_view.ESRBRatingViewSet)
router.register(r'recommendations/games/dislike', recommendations_view.UserRecommendationDislikeViewSet)
router.register(r'reviews/carousel', reviews_view.ReviewCarouselViewSet)
router.register(r'reviews/carousel/top100', reviews_view.Top100ReviewCarouselViewSet)
router.register(r'search', common_views.SearchView)
router.register(r'software', files_views.SoftwareViewSet)
router.register(r'stores', games_view.StoreViewSet)
router.register(r'stories', stories_view.StoriesViewSet)
router.register(r'suggestions', suggestions_view.SuggestionsViewSet)
router.register(r'tags', games_view.TagViewSet)
router.register(r'token/achievements', token_view.CycleKarmaViewSet)
router.register(r'token/games', token_view.GamesViewSet)
router.register(r'token/players', token_view.CycleUserViewSet)
router.register(r'unsubscribe', mailer_view.UnsubscribeViewSet)

games = r'games'
games_linked_router = routers.NestedSimpleRouter(router, games, lookup='game', **kwargs)
games_linked_router.register(r'additions', games_view.AdditionViewSet, base_name='additions')
games_parent_router = routers.NestedSimpleRouter(router, games, lookup='game', **kwargs)
games_parent_router.register(r'parent-games', games_view.ParentGameViewSet, base_name='parent-games')
games_series_router = routers.NestedSimpleRouter(router, games, lookup='game', **kwargs)
games_series_router.register(r'game-series', games_view.GameSeriesViewSet, base_name='game-series')
games_stores_router = routers.NestedSimpleRouter(router, games, lookup='game', **kwargs)
games_stores_router.register(r'stores', games_view.GameStoreViewSet, base_name='stores')
games_screenshot_router = routers.NestedSimpleRouter(router, games, lookup='game', **kwargs)
games_screenshot_router.register(r'screenshots', games_view.GameScreenshotViewSet, base_name='screenshots')
games_creators_router = routers.NestedSimpleRouter(router, games, lookup='game', **kwargs)
games_creators_router.register(r'development-team', games_view.GamePersonViewSet, base_name='game-creators')

collections_router = DefaultRouter(**kwargs)
collections_router.include_root_view = False
collections = r'collections'
collections_router.register(collections, games_view.CollectionViewSet)
collections_feed_router = routers.NestedSimpleRouter(collections_router, collections, lookup='collection', **kwargs)
collections_feed_router.register(r'feed', games_view.CollectionFeedViewSet)
collections_games_router = routers.NestedSimpleRouter(collections_router, collections, lookup='collection', **kwargs)
collections_games_router.register(r'games', games_view.CollectionGameViewSet)
collections_offers_router = routers.NestedSimpleRouter(collections_router, collections, lookup='collection', **kwargs)
collections_offers_router.register(r'offers', games_view.CollectionOfferViewSet)
collections_likes_router = routers.NestedSimpleRouter(collections_router, collections, lookup='collection', **kwargs)
collections_likes_router.register(r'likes', games_view.CollectionLikeViewSet)
collections_feed_comments_router = routers.NestedSimpleRouter(
    collections_feed_router, r'feed', lookup='object', **kwargs
)
collections_feed_comments_router.register(comments, games_view.CollectionFeedCommentViewSet)
collections_feed_comments_likes_router = routers.NestedSimpleRouter(
    collections_feed_comments_router, comments, lookup='comment', **kwargs
)
collections_feed_comments_likes_router.register(r'likes', games_view.CollectionFeedCommentLikeViewSet)

discussions_router = DefaultRouter(**kwargs)
discussions_router.include_root_view = False
discussions = r'discussions'
discussions_router.register(discussions, discussions_views.DiscussionViewSet)
discussions_comments_router = routers.NestedSimpleRouter(discussions_router, discussions, lookup='object', **kwargs)
discussions_comments_router.register(comments, discussions_views.CommentViewSet)
discussions_comments_likes_router = routers.NestedSimpleRouter(
    discussions_comments_router, comments, lookup='comment', **kwargs
)
discussions_comments_likes_router.register(r'likes', discussions_views.CommentLikeViewSet)

feed_router = DefaultRouter(**kwargs)
feed = r'feed'
feed_router.register(feed, feed_views.FeedViewSet)
reactions_router = routers.NestedSimpleRouter(feed_router, feed, lookup='feed', **kwargs)
reactions = r'reactions'
reactions_router.register(reactions, feed_views.ReactionViewSet)
user_reactions_router = routers.NestedSimpleRouter(reactions_router, reactions, lookup='reaction', **kwargs)
user_reactions_router.register(r'users', feed_views.UserReactionViewSet)

reviews_router = DefaultRouter(**kwargs)
reviews = r'reviews'
reviews_router.register(reviews, reviews_view.ReviewViewSet)
reviews_likes_router = routers.NestedSimpleRouter(reviews_router, reviews, lookup='review', **kwargs)
reviews_likes_router.register(r'likes', reviews_view.LikeViewSet)
reviews_comments_router = routers.NestedSimpleRouter(reviews_router, reviews, lookup='object', **kwargs)
reviews_comments_router.register(comments, reviews_view.CommentViewSet)
reviews_comments_likes_router = routers.NestedSimpleRouter(
    reviews_comments_router, comments, lookup='comment',
    **kwargs
)
reviews_comments_likes_router.register(r'likes', reviews_view.CommentLikeViewSet)

users_router = DefaultRouter(**kwargs)
users = r'users'
users_router.register(users, users_views.UserViewSet)
users_follow_router = routers.NestedSimpleRouter(users_router, users, lookup='user', **kwargs)
users_follow_router.register(r'following/users', users_views.UserFollowUserViewSet)
users_follow_collection_router = routers.NestedSimpleRouter(users_router, users, lookup='user', **kwargs)
users_follow_collection_router.register(r'following/collections', users_views.UserFollowCollectionViewSet)
users_follow_element_router = routers.NestedSimpleRouter(users_router, users, lookup='user', **kwargs)
users_follow_element_router.register(r'following/instances', users_views.UserFollowElementViewSet)
users_games_router = routers.NestedSimpleRouter(users_router, users, lookup='user', **kwargs)
users_games_router.register(r'games', users_views.UserGameViewSet)
users_favorites_router = routers.NestedSimpleRouter(users_router, users, lookup='user', **kwargs)
users_favorites_router.register(r'favorites', users_views.UserFavoriteGameViewSet)

payment_router = DefaultRouter(**kwargs)
payment_router.register('payment', payments_views.PaymentViewSet, basename='payment')
payment_router.register('game/paytoken', payments_views.PaymentViewSet, basename='payment_token')

app_name = 'api'
urlpatterns = [
    # path('auth/login', auth_views.EmailLoginView.as_view(), name='rest_login'),
    # path('auth/register', auth_views.RegisterView.as_view(), name='rest_register'),
    # path('auth/steam', auth_views.SteamLoginView.as_view(), name='rest_login_steam'),
    # path('auth/facebook', auth_views.FacebookLoginView.as_view(), name='rest_login_facebook'),
    # path('auth/twitter', auth_views.TwitterLoginView.as_view(), name='rest_login_twitter'),
    # path('auth/vk', auth_views.VKLoginView.as_view(), name='rest_login_vk'),
    # path('auth/email/confirm', auth_views.ConfirmEmailView.as_view(), name='rest_verify_email'),
    # path('auth/email/change', auth_views.ChangeEmailView.as_view(), name='rest_email_change'),
    # path('auth/email/request-confirm', auth_views.RequestConfirmEmailView.as_view(),
    #      name='rest_email_request_confirm'),
    # path('auth/password/reset', rest_views.PasswordResetView.as_view(), name='rest_password_reset'),
    # path('auth/password/reset/confirm', auth_views.PasswordResetConfirmView.as_view(), name='rest_password_confirm'),
    # path('auth/password/change', auth_views.ChangePasswordView.as_view(), name='rest_password_change'),
    # path('auth/social/write', auth_views.CheckSocialWritePermission.as_view(), name='rest_check_social_write'),
    path('banners/active', banners_views.ActiveView.as_view(), name='banners_active'),
    path('banners/medium', banners_views.MediumView.as_view(), name='banners_medium'),
    path('seo-links', common_views.SeoLinkView.as_view(), name='seo_links'),
    path('file-api-auth', common_views.FileApiAuthView.as_view(), name='file_api_auth'),
    path('stat/carousel-rating', stat_view.CarouselRatingView.as_view(), name='carousel_rating'),
    path('stat/story', stat_view.StoryView.as_view(), name='story'),
    path('stat/store-visit', stat_view.StoreVisitView.as_view(), name='store_visit'),
    path('stripe/create-checkout-session', stripe_view.StripeCreateCheckoutSessionView.as_view(),
         name='stripe_create_session'),
    path('stripe/checkout-session', stripe_view.StripeCheckoutSessionView.as_view(), name='stripe_get_session'),
    path('stripe/customer-portal', stripe_view.StripeCustomerPortalView.as_view(), name='stripe_customer_portal'),
    path('stripe/webhook', stripe_view.StripeWebhookView.as_view(), name='stripe_webhook'),
    path('token/cycle', token_view.CycleView.as_view(), name='token_cycle'),
    path('token/join', token_view.JoinView.as_view(), name='token_join'),
    path('token/reward', token_view.RewardView.as_view(), name='token_reward'),
    path('token/subscribe', token_view.SubscribeView.as_view(), name='token_subscribe'),
    path('token/last-achievement', token_view.CycleKarmaLastView.as_view(), name='last_achievement'),
    path('pusher/auth', pusher_view.AuthView.as_view(), name='rest_pusher_auth'),
    path('pusher/webhook', pusher_view.WebHookView.as_view(), name='rest_pusher_webhook'),
    path('sessiondata/<game_sid>', games_view.PlayerGameDataView.as_view(), name='gamesessiondata'),
    path('ad/adfox_parameters', ad_views.AdFoxCompanyParameterView.as_view(), name='adfox_parameters'),
    path('games/featured', games_view.FeaturedList.as_view(), name='featured'),
    path('games/recommended', games_view.RecommendedList.as_view(), name='recommended'),
    path('games/last_played', games_view.LastPlayed.as_view(), name='last_played'),
    path('xsolla/webhook', payments_views.WebhookView.as_view(), name='xsolla_webhook'),
    path('ukassa/webhook', payments_views.UkassaWebhookView.as_view(), name='ukassa_webhook'),
    path('payment/loyalty/on_logins', payments_views.LoginLoyaltyProgramView.as_view(), name='logins_loyalty_program'),
    path('game/payment_transaction', payments_views.TransactionView.as_view(), name='payment_transaction'),
    path('players', users_views.PlayerView.as_view(), name='players'),
    path('users/game_status_subscription', users_views.SubscriptionView.as_view(), name='game_status_subscription'),
    path('games/<int:game_id>/plays', games_view.GamePlays.as_view(), name='game_plays'),
    path('ingamenews-madworld', games_view.MadWorldNewsView.as_view(), name='madword_news'),
    path('apk/active', apk_views.APKView.as_view(), name='apk_app'),
    path('', include(router.urls)),
    path('', include(games_linked_router.urls)),
    path('', include(games_parent_router.urls)),
    path('', include(games_series_router.urls)),
    path('', include(games_stores_router.urls)),
    path('', include(games_screenshot_router.urls)),
    path('', include(games_creators_router.urls)),
    path('', include(collections_router.urls)),
    path('', include(collections_feed_router.urls)),
    path('', include(collections_feed_comments_router.urls)),
    path('', include(collections_feed_comments_likes_router.urls)),
    path('', include(collections_games_router.urls)),
    path('', include(collections_offers_router.urls)),
    path('', include(collections_likes_router.urls)),
    path('', include(discussions_router.urls)),
    path('', include(discussions_comments_router.urls)),
    path('', include(discussions_comments_likes_router.urls)),
    path('', include(feed_router.urls)),
    path('', include(reactions_router.urls)),
    path('', include(user_reactions_router.urls)),
    path('', include(reviews_router.urls)),
    path('', include(reviews_likes_router.urls)),
    path('', include(reviews_comments_router.urls)),
    path('', include(reviews_comments_likes_router.urls)),
    path('', include(users_router.urls)),
    path('', include(users_follow_router.urls)),
    path('', include(users_follow_collection_router.urls)),
    path('', include(users_follow_element_router.urls)),
    path('', include(users_games_router.urls)),
    path('', include(users_favorites_router.urls)),
    path('', include(payment_router.urls)),
]
