from allauth.socialaccount.models import SocialAccount

API_URLS = {
    'steam_id': 'http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/',
    'owned_games': 'http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/',
    'game_detail': 'http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v0002/',
    'user_info': 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/',
    'friends': 'http://api.steampowered.com/ISteamUser/GetFriendList/v0001/',
    'achievements': 'http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/',
    'recently_games': 'http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/',
}


def friends(user_id):
    from apps.merger.profiles.steam import get_friends
    try:
        account = SocialAccount.objects.get(provider='openid', user=user_id)
    except SocialAccount.DoesNotExist:
        return []
    return SocialAccount.objects \
        .filter(uid__in=get_friends(account.uid, False), provider='openid') \
        .values_list('user_id', flat=True)
