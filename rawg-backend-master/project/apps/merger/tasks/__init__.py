import reversion
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import OperationalError, transaction
from django.utils import translation
from django.utils.timezone import now
from psycopg2._psycopg import TransactionRollbackError

from apps.celery import app as celery
from apps.merger.merger import merge
from apps.merger.models import Import, ImportLog, Network, SimilarGame
from apps.merger.profiles import psn
from apps.merger.tasks.common import STORES, fill, remove_game_cached
from apps.merger.tasks.gog import gog_games
from apps.merger.tasks.mocks import sync_mocks_clear
from apps.merger.tasks.playstation import psn_games
# from apps.merger.tasks.raptr import raptr_games
from apps.merger.tasks.steam import steam_games
from apps.merger.tasks.xbox import xbox_games
from apps.pusher.models import Notification
from apps.users.models import UserGame
from apps.utils.celery import lock
from apps.utils.ganalytics import HitClient, get_cid_from_cookie
from apps.utils.request import get_client_ip
from apps.utils.tasks import send_email

NETWORKS_TASKS = {
    'gog': gog_games,
    'playstation': psn_games,
    # 'raptr': raptr_games,
    'steam': steam_games,
    'xbox': xbox_games,
}


@transaction.atomic
def import_games(services, user, request):
    ip = None
    ua = None
    al = None
    cid = None
    meta = getattr(request, 'META', None)
    if meta:
        ip = get_client_ip(request)
        ua = meta.get('HTTP_USER_AGENT')
        al = meta.get('HTTP_ACCEPT_LANGUAGE')
    cookies = getattr(request, 'COOKIES', None)
    if cookies:
        cid = get_cid_from_cookie(cookies.get('_ga'))
    date = now()
    if 'steam' in services:
        user.reset_steam()
        user.steam_id_date = date
        user.steam_id_status = 'process'
        ga_import.delay(user.id, 'steam', ip, ua, al, cid, request.LANGUAGE_CODE)
    if 'xbox' in services:
        user.reset_xbox()
        user.gamer_tag_date = date
        user.gamer_tag_status = 'process'
        ga_import.delay(user.id, 'xbox', ip, ua, al, cid, request.LANGUAGE_CODE)
    if 'playstation' in services:
        user.reset_playstation()
        user.psn_online_id_date = date
        user.psn_online_id_status = 'process'
        ga_import.delay(user.id, 'psn', ip, ua, al, cid, request.LANGUAGE_CODE)
    if 'gog' in services:
        user.reset_gog()
        user.gog_date = date
        user.gog_status = 'process'
        ga_import.delay(user.id, 'gog', ip, ua, al, cid, request.LANGUAGE_CODE)
    # if 'raptr' in services:
    #     user.raptr_date = date
    #     user.raptr_status = 'process'
    #     ga_import.delay(user.id, 'raptr', ip, ua, al, cid, request.LANGUAGE_CODE)
    transaction.on_commit(lambda: sync_user.delay(user.id, is_sync=False))
    user.save()
    ga_import.delay(user.id, 'any', ip, ua, al, cid, request.LANGUAGE_CODE)


def finish(results_all, user_id, is_sync=False, is_sync_old=False, is_manual=False):
    if type(results_all) is list:
        results = {}
        for row in results_all:
            for field, value in row.items():
                results[field] = value
    else:
        results = results_all
    if not results:
        return

    fields_success = {}
    fields_errors = {}
    titles = []
    logs = []
    for param in STORES:
        status = results.get(param.field_status)
        if status:
            fields = [param.field, param.field_status, param.field_date]
            if status == 'ready':
                titles.append(param.title)
                fill(fields_success, fields, results)
            if status == 'error':
                fill(fields_errors, fields, results)
            network, _ = Network.objects.get_or_create(name=param.title)
            logs.append(ImportLog(user_id=user_id,
                                  network=network,
                                  account=results.get(param.field) or '',
                                  status=status,
                                  date=results.get(param.field_date) or now(),
                                  duration=results.get(param.field_duration) or 0,
                                  is_sync=is_sync,
                                  is_sync_old=is_sync_old))

    try:
        user = get_user_model().objects.get(id=user_id)
    except get_user_model().DoesNotExist:
        return
    for field, value in results.items():
        if field:
            setattr(user, field, value)

    statuses = {}
    for param in STORES:
        for user_game in results.get(param.field_games) or []:
            items = statuses.get(user_game['status'], [])
            if user_game['game_id'] in items:
                continue
            items.append(user_game['game_id'])
            statuses[user_game['status']] = items

    with transaction.atomic():
        user.save()
        ImportLog.objects.bulk_create(logs)
        if fields_success and (not is_sync or (is_manual and statuses)):
            if is_sync:
                fields_success['is_sync'] = True
            Notification.objects.create(user=user, action='import', data=fields_success)
        if fields_errors:
            if is_sync:
                fields_errors['is_sync'] = True
            Notification.objects.create(user=user, action='import', data=fields_errors)

    # recalculate user's statistics before finishing
    if titles and not is_sync:
        try:
            user.set_statistics()
        except UserGame.game.RelatedObjectDoesNotExist:
            pass

    if user.real_email:
        if titles and not is_sync:
            send_email.delay(
                f'merger/email_{user.source_language}/import_finished',
                {'username': user.username, 'services': titles, 'user_slug': user.slug},
                [user.real_email],
                language=user.source_language
            )
        if is_sync and is_sync_old and statuses and user.subscribe_mail_synchronization:
            send_email.delay(
                f'merger/email_{user.source_language}/sync_old_finished',
                {'username': user.username, 'services': titles, 'user_slug': user.slug},
                [user.real_email],
                language=user.source_language
            )
    if is_sync:
        sync_mocks_clear(user_id)


@celery.task(time_limit=600, bind=True, ignore_result=True, max_retries=90, acks_late=True, reject_on_worker_lost=True)
def merge_games(self, similar_id, user_id=None):
    try:
        with lock('apps.merger.tasks.merge_games', self.app.oid) as acquired:
            if not acquired:
                self.retry(countdown=3 * min(max(1, self.request.retries), 10))

            with reversion.create_revision(), translation.override(settings.MODELTRANSLATION_DEFAULT_LANGUAGE):
                similar = SimilarGame.objects.get(id=similar_id)
                if similar.first_game_id == similar.selected_game:
                    merge(similar.first_game, similar.second_game)
                else:
                    merge(similar.second_game, similar.first_game)
                if user_id:
                    reversion.set_user(get_user_model().objects.get(pk=user_id))
                reversion.set_comment('Merged games.')
                remove_game_cached(similar.first_game_id)
                remove_game_cached(similar.second_game_id)
    except (TransactionRollbackError, OperationalError):
        self.retry(countdown=3 * min(self.request.retries, 10))
    except SimilarGame.DoesNotExist:
        return


@celery.task(time_limit=10, ignore_result=True)
def ga_import(user_id, action, ip=None, ua=None, al=None, cid=None, language=''):
    ga = getattr(settings, f'GA_ANALYTICS_{language.upper()}')
    if not ga:
        return
    client = HitClient(ga, ip, ua, al, cid)
    client.send_hit('event', event_category='user_import', event_action=action)


@celery.task(time_limit=300, bind=True, ignore_result=True)
def check_tokens(self):
    with lock('apps.merger.tasks.check_tokens', self.app.oid) as acquired:
        if not acquired:
            return
        for row in settings.RUN_IMPORTS:
            psn.check_tokens(row['PSN_API_USERNAME'])


@celery.task(time_limit=30, bind=True, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def sync_user(self, user_id, is_sync=True, is_old=False, is_manual=True, is_fast=False):
    if Import.objects.filter(user_id=user_id, is_sync=is_sync, is_started=False).count():
        return
    return Import.objects.create(
        date=now(), user_id=user_id, is_sync=is_sync, is_fast=is_fast, is_old=is_old, is_manual=is_manual
    ).id


def check_syncs(ids):
    return not Import.objects.filter(id__in=ids).count()


@celery.task(time_limit=10, ignore_result=True)
def import_queue(processes, process_num):
    qs = Import.import_qs(processes, process_num, False)
    for i, (user_id, retries) in enumerate(qs.values_list('user_id', 'retries')):
        if retries:
            continue
        Notification.objects.create(user_id=user_id, action='import-waiting', data={
            'position_in_queue': i + 1,
            'approximate_seconds': Import.approximate_seconds(i + 1),
        }, confirmed=True)
