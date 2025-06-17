from datetime import datetime, timedelta
from time import sleep

import pytz
from django.contrib.auth import get_user_model
from django.utils.timezone import now

from apps.achievements.models import Achievement, UserAchievement
from apps.merger.models import Network
from apps.merger.profiles import steam
from apps.merger.tasks.common import get_game_cached, save_games
from apps.users.models import UserGame
from apps.utils.api import get_object_or_none


def pause():
    sleep(1)


def get_time(stamp):
    if not stamp:
        return None
    return datetime.fromtimestamp(stamp).replace(tzinfo=pytz.UTC)


def load_achievements_steam(app_id, network, game_name):
    game = steam.get_game(app_id)
    if not game:
        return
    game_instance, game_name = get_game_cached(app_id, game_name or game['game']['gameName'], network.slug)
    for achieve in game['game']['availableGameStats']['achievements']:
        uid = Achievement.get_uid(app_id, achieve['name'])
        icon = achieve.get('icon', '')
        Achievement.create_or_update(
            uid, achieve['displayName'], game_instance, game_name, achieve.get('description', ''),
            '' if icon.endswith('{}/'.format(app_id)) else icon, network, bool(achieve['hidden'])
        )
    pause()


def steam_achievements(steam_uid, user_id, games=None, is_fast=False):
    network, _ = Network.objects.get_or_create(name='Steam')
    # detect synchronization period
    last_sync_steam, steam_games_playtime = get_user_model().objects \
        .values_list('last_sync_steam', 'steam_games_playtime').get(id=user_id)
    is_filter = False
    two_weeks_ago = now() - timedelta(days=12)
    if (last_sync_steam and last_sync_steam > two_weeks_ago) or is_fast:
        games = steam.get_recently_games(steam_uid)
        if steam_games_playtime:
            is_filter = True
    # iterate games
    new_steam_games_playtime = {}
    for game in games:
        # detect playtime to skip unchanged games
        new_playtime = game.get('playtime_2weeks') or 0
        old_playtime = (steam_games_playtime or {}).get(str(game['appid'])) or 0
        new_steam_games_playtime[game['appid']] = new_playtime
        if is_filter and new_playtime and new_playtime == old_playtime:
            continue
        # get achievements for this game
        game_name, achievements = steam.get_achievements(game['appid'], steam_uid)
        if not achievements:
            continue
        # iterate achievements
        last_played = None
        game_id = None
        for achieve in achievements:
            if not achieve['achieved']:
                continue
            uid = Achievement.get_uid(game['appid'], achieve['apiname'])
            achievement = get_object_or_none(Achievement, uid=uid, network=network)
            if not achievement:
                load_achievements_steam(game['appid'], network, game_name)
                achievement = get_object_or_none(Achievement, uid=uid, network=network)
                if not achievement:
                    continue
            unlock_time = get_time(achieve['unlocktime'])
            UserAchievement.objects.get_or_create(
                user_id=user_id,
                achievement=achievement,
                defaults={'achieved': unlock_time}
            )
            # remember the last played date
            if unlock_time and (not last_played or unlock_time > last_played):
                last_played = unlock_time
                if not game_id and achievement.parent.game_id:
                    game_id = achievement.parent.game_id
        # save the last played date
        if last_played:
            user_game = get_object_or_none(UserGame, user_id=user_id, game_id=game_id)
            if user_game:
                if is_filter and last_played < two_weeks_ago:
                    last_played = two_weeks_ago
                if not user_game.last_played or last_played > user_game.last_played:
                    user_game.last_played = last_played
                    user_game.save(update_fields=['last_played'])
        pause()
    # save new playtime
    get_user_model().objects.filter(id=user_id).update(steam_games_playtime=new_steam_games_playtime)


def steam_games(steam_id, user_id, is_sync=False, is_fast=False, steam_uid=None, disable_achievements=False):
    started = now()

    if is_sync and steam_uid:
        pass
    else:
        steam_uid = steam.get_id(steam_id, timeout=30)
        get_user_model().objects.filter(id=user_id).update(steam_id_uid=steam_uid or '')

    games = steam.get_games(steam_uid, timeout=30)
    if not games:
        return {
            'steam_id': steam_id,
            'steam_id_status': 'error',
            'steam_id_date': now(),
            'steam_id_duration': (now() - started).seconds,
        }

    is_achievements = is_sync and not disable_achievements
    if is_achievements:
        steam_achievements(steam_uid, user_id, games, is_fast)

    return save_games(games, user_id, 'steam_id', steam_id, is_sync, is_fast, is_achievements, started)
