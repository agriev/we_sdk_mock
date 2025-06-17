from django.urls import path

from apps.stat import views

app_name = 'stat'
urlpatterns = [
    path('users/registrations/', views.UsersRegistrationsView.as_view(), name='users_registrations'),
    path('users/visits/', views.UsersVisitsView.as_view(), name='users_visits'),
    path('users/retention/week/', views.UsersRetentionWeekView.as_view(), name='users_retention_week'),
    path('users/retention/month/', views.UsersRetentionMonthView.as_view(), name='users_retention_month'),
    path('users/retention/d1d7d30/', views.UsersRetentionD1D7D30View.as_view(), name='users_retention_d1d7d30'),
    path('users/online/', views.UsersOnlineView.as_view(), name='users_online'),
    path('users/activity/', views.UsersActivityView.as_view(), name='users_activity'),
    path('data/statuses/', views.DataStatusesView.as_view(), name='data_statuses'),
    path('data/collections/', views.DataCollectionsView.as_view(), name='data_collections'),
    path('data/reviews/', views.DataReviewsView.as_view(), name='data_reviews'),
    path('data/comments/', views.DataCommentsView.as_view(), name='data_comments'),
    path('data/follows/', views.DataFollowingsView.as_view(), name='data_followings'),
    path('data/games/', views.DataGamesView.as_view(), name='data_games'),
    path('games/statuses/', views.GamesStatusesView.as_view(), name='games_statuses'),
    path('games/revisions/', views.GamesRevisionsView.as_view(), name='games_revisions'),
    path('recommendations/totals/', views.RecommendationsTotalsView.as_view(), name='recommendations_totals'),
    path('api/user-agent/', views.APIUserAgentView.as_view(), name='api_user_agent'),
    path('api/ip/', views.APIIPView.as_view(), name='api_ip'),
    path('api/ip-and-user-agent/', views.APIIPAndUserAgentView.as_view(), name='api_ip_and_user_agent'),
    path('api/user/', views.APIUserView.as_view(), name='api_user'),
]
