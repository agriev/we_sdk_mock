from datetime import timedelta
from time import sleep

from django.contrib.auth import get_user_model
from django.utils.timezone import now

from apps.achievements.models import Achievement, UserAchievement
from apps.merger.models import Network
from apps.merger.profiles import psn
from apps.merger.tasks.common import get_game_cached, save_games
from apps.utils.api import get_object_or_none


def pause(is_sync):
    sleep(3 if is_sync else 1)


def psn_achievements(psn_online_id, user_id, games=None, is_sync=False, is_fast=False):
    network, _ = Network.objects.get_or_create(name='PlayStation')
    # detect synchronization period
    last_sync = get_user_model().objects.values_list('last_sync_psn', flat=True).get(id=user_id)
    # iterate games
    for game in games:
        if not game['alt_id']:
            continue
        # detect last synchronization date to skip already synchronized games
        compare_date = None
        if is_fast:
            compare_date = now() - timedelta(days=is_fast)
        elif last_sync:
            compare_date = last_sync - timedelta(days=2)
        if compare_date and game['last_played'] and game['last_played'] < compare_date:
            continue
        # get achievements for this game
        achievements = psn.get_achievements(game['alt_id'], psn_online_id)
        if not achievements:
            continue
        game_instance, game_name = get_game_cached(
            game['id'], game['name'], network.slug, {'store_internal_id__icontains': game['id']}
        )
        # iterate achievements
        for achieve in achievements:
            uid = Achievement.get_uid(game['id'], achieve['id'])
            achievement = get_object_or_none(Achievement, uid=uid, network=network)
            if not achievement:
                achievement = Achievement.create_or_update(
                    uid, achieve['name'], game_instance, game_name,
                    achieve['description'], achieve['image'], network, achieve['hidden']
                )
            if achieve['earned']:
                UserAchievement.objects.get_or_create(
                    user_id=user_id, achievement=achievement, defaults={'achieved': achieve['earned_time']}
                )
        pause(is_sync)


def psn_games(psn_online_id, user_id, is_sync=False, is_fast=False, disable_achievements=False):
    started = now()

    games = psn.get_games(psn_online_id, timeout=30)
    if not games:
        return {
            'psn_online_id': psn_online_id,
            'psn_online_id_status': 'error',
            'psn_online_id_date': now(),
            'psn_online_id_duration': (now() - started).seconds,
        }

    is_achievements = is_sync and not disable_achievements
    if is_achievements:
        psn_achievements(psn_online_id, user_id, games, is_sync, is_fast)

    return save_games(games, user_id, 'psn_online_id', psn_online_id, is_sync, is_fast, is_achievements, started)
