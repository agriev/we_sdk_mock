import timeit
from collections import Counter
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.timezone import now
from tqdm import tqdm

from apps.games.models import Game
from apps.recommendations.models import UserRecommendation, UserRecommendationQueue
from apps.users.models import UserFollowElement, UserGame
from apps.utils.dates import yesterday
from apps.utils.db import copy_from_conflict
from apps.utils.dicts import find

MIN_ADDED = 20
MIN_RATING = 3.0
MIN_RELEASED = now().date() - timedelta(days=365 * 3)
GAMES_NUM = 300
GAMES_SUBSCRIPTION_MAX = 30
GAMES_TOP_COUNT = 10000
ROTATE_PARTS = 6
START_POSITION = 999
LEAVE_SUBSCRIPTIONS_DAYS = 7


class Command(BaseCommand):
    help = 'Create users recommendations'
    prefetched = False
    disable_tqdm = False
    game_released = {}
    game_added = {}
    game_rating = {}
    game_weighted_rating = {}
    game_platforms = {}
    game_suggestions = {}
    iterations = 0

    def add_arguments(self, parser):
        parser.add_argument('-i', '--user_id', action='store', dest='user_id', default=0, type=int)
        parser.add_argument('-r', '--recent', action='store_true', dest='recent', default=False)
        parser.add_argument('-s', '--staff', action='store_true', dest='staff', default=False)
        parser.add_argument('-p', '--prefetch', action='store_true', dest='prefetch', default=False)
        parser.add_argument('-t', '--prefetch-top', action='store_true', dest='prefetch_top', default=False)
        parser.add_argument('-q', '--queue', action='store_true', dest='queue', default=False)

    def handle(self, *args, **options):
        if not self.iterations:
            if options['prefetch_top']:
                self.prefetch(only_top=True)
            elif options['prefetch']:
                self.prefetch()

        qs = get_user_model().objects
        if options['queue']:
            user_ids = list(
                UserRecommendationQueue.objects
                .filter(target=UserRecommendationQueue.TARGETS_META, datetime__lte=now())
                .values_list('user_id', flat=True)
            )
            if user_ids:
                qs = qs.filter(id__in=user_ids)
            else:
                self.stdout.write(self.style.SUCCESS('Queue is empty'))
                return
        elif options['user_id']:
            qs = qs.filter(id=options['user_id'])
        elif options['recent']:
            qs = qs.filter(games_count__gt=0, last_entered__gte=yesterday(days=7))
        elif options['staff']:
            qs = qs.filter(games_count__gt=0, is_staff=True)
        else:
            qs = qs.filter(games_count__gt=0)

        self.print('Users', 'WARNING', disable=self.disable_tqdm)
        for user in tqdm(
            qs.only('id', 'settings').order_by('id').iterator(),
            total=qs.count(),
            disable=self.disable_tqdm
        ):
            start = None
            if self.disable_tqdm:
                start = timeit.default_timer()
            self.process_user(user)
            UserRecommendationQueue.objects.filter(
                target=UserRecommendationQueue.TARGETS_META, user_id=user.id
            ).delete()
            if start:
                self.stdout.write(self.style.SUCCESS(
                    'User #{} - {:.2f}s'.format(user.id, timeit.default_timer() - start)
                ))
        self.print('OK', disable=self.disable_tqdm)

    def prefetch(self, qs=None, only_top=False, disable_tqdm=False):
        self.print('Prefetch', 'WARNING', disable=self.disable_tqdm or disable_tqdm)
        self.prefetched = False
        if qs is None:
            qs = Game.objects.filter(added__gt=0)
            self.prefetched = True
        if only_top:
            qs = qs.order_by('-added')[:GAMES_TOP_COUNT]
            self.prefetched = False
        for pk, suggestions, platforms_json, released, tba, added, rating, weighted_rating in tqdm(
            qs.values_list(
                'id', 'suggestions', 'platforms_json', 'released', 'tba', 'added', 'rating', 'weighted_rating'
            ).iterator(),
            total=qs.count(),
            disable=self.disable_tqdm or disable_tqdm
        ):
            self.game_suggestions[pk] = (suggestions or {}).get('games') or []
            self.game_released[pk] = released or tba
            self.game_added[pk] = added
            self.game_rating[pk] = rating
            self.game_weighted_rating[pk] = weighted_rating
            for platform in platforms_json or []:
                self.game_platforms.setdefault(pk, set()).add(platform['platform']['id'])
        self.print('OK', disable=self.disable_tqdm or disable_tqdm)

    def process_user(self, user):
        # get user's games and subscriptions
        user_games = set(UserGame.objects.visible().filter(user_id=user.id).values_list('game_id', flat=True))
        user_subscriptions = list(UserFollowElement.objects.elements(user.id))
        if not user_games and not user_subscriptions:
            return

        # prefetch games suggestions
        if not self.prefetched:
            missed_suggestions = user_games - self.game_suggestions.keys()
            self.prefetch(qs=Game.objects.filter(id__in=missed_suggestions), disable_tqdm=True)

        # calculate similar games
        similar_games = Counter()
        for game_id in user_games:
            try:
                for suggested_game_id in self.game_suggestions[game_id]:
                    similar_games[suggested_game_id] += 1
            except KeyError:
                continue

        # get new games from subscriptions
        subscription_games = Counter()
        subscription_games_to_filter = set()
        subscription_games_not_to_filter = set()
        subscription_games_related_ids = {}
        for el in user_subscriptions:
            model = el.content_type.model_class()
            qs = UserFollowElement.INSTANCES_GAME_QUERIES.get(model)
            table = UserFollowElement.INSTANCES_ID_TABLES.get(el.content_type.model)
            kwargs, distinct = qs(el.object_id)
            extra = {'order_by': [f'-{table}.id'], 'select': {'relation_id': f'{table}.id'}}
            if el.last_viewed_id:
                extra['where'] = [f'{table}.id > {el.last_viewed_id}']
            el_games = Game.objects.filter(**kwargs).extra(**extra)
            if distinct:
                el_games = el_games.distinct()
            qs = el_games.values_list('id', flat=True)
            if not el.last_viewed_id:
                qs = qs[:GAMES_SUBSCRIPTION_MAX]
            for pk in qs:
                subscription_games[pk] += 1
                subscription_games_related_ids[pk] = f'{model._meta.model_name}:{el.object_id}'
                if model in UserFollowElement.INSTANCES_TO_FILTER:
                    subscription_games_to_filter.add(pk)
                else:
                    subscription_games_not_to_filter.add(pk)

        # prefetch games data
        if not self.prefetched:
            missed_games = (set(similar_games) | set(subscription_games)) - self.game_added.keys()
            self.prefetch(qs=Game.objects.filter(id__in=missed_games), disable_tqdm=True)

        # get user's platforms
        platforms = find(user.settings, 'users_platforms', [])

        # filter all similar games and a part of subscription games
        for game_id in set(similar_games.keys()) - subscription_games_not_to_filter | subscription_games_to_filter:
            try:
                not_added = self.game_added[game_id] < MIN_ADDED
                not_rating = self.game_rating[game_id] < MIN_RATING and self.game_weighted_rating[game_id] < MIN_RATING
                released = self.game_released[game_id]
            except KeyError:
                user_games.add(game_id)
                continue
            not_released = not (released and (released is True or released > MIN_RELEASED))
            not_platforms = not self.game_platforms.get(game_id, set()).intersection(platforms)
            if not_platforms or not_released or (not_added and not_rating):
                user_games.add(game_id)

        # filter games which the user already has in the library
        for game_id in user_games:
            del similar_games[game_id]
            del subscription_games[game_id]

        # filter games which were in user's recommendations
        for game_id in UserRecommendation.objects.hidden().filter(user_id=user.id).values_list('game_id', flat=True):
            del similar_games[game_id]
            del subscription_games[game_id]

        # get user's info
        now_date = now()
        if not user.settings:
            user.settings = dict()
        settings_path_cycle = 'recommendations_users_cycle'
        settings_path_date = 'recommendations_users_date'
        cycle = user.settings.get(settings_path_cycle) or 0
        cycle += 1
        user.settings[settings_path_cycle] = cycle
        user.settings[settings_path_date] = now_date.isoformat()

        # limit subscription games
        subscription_games = [game_id for game_id, _ in subscription_games.most_common(GAMES_NUM)]

        # rotate similar games
        cycle_mod = cycle % ROTATE_PARTS
        similar_library_games = [
            game_id for i, (game_id, _) in enumerate(similar_games.most_common(GAMES_NUM))
            if i % ROTATE_PARTS == cycle_mod
        ]

        # save old creating dates
        old_created = {}
        if cycle > 1:
            old_created = dict(
                UserRecommendation.objects.visible()
                .filter(
                    sources__overlap=[
                        UserRecommendation.SOURCES_SUBSCRIBE, UserRecommendation.SOURCES_LIBRARY_SIMILAR
                    ],
                    user_id=user.id
                )
                .values_list('game_id', 'created')
            )

        # prepare for sql
        records = []
        position = START_POSITION
        for game_id in subscription_games:
            position += 1
            sources = UserRecommendation.SOURCES_SUBSCRIBE
            if game_id in similar_library_games:
                sources = f'{sources},{UserRecommendation.SOURCES_LIBRARY_SIMILAR}'
            records.append([
                user.id, game_id, '{{{}}}'.format(sources),
                old_created.get(game_id, now_date), now_date, position, False,
                '{{{}}}'.format(subscription_games_related_ids.get(game_id, ''))
            ])
        for game_id in similar_library_games:
            if game_id in subscription_games:
                continue
            position += 1
            records.append([
                user.id, game_id, '{{{}}}'.format(UserRecommendation.SOURCES_LIBRARY_SIMILAR),
                old_created.get(game_id, now_date), now_date, position, False, '{}'
            ])

        # write all
        subscription_days = now_date - timedelta(days=LEAVE_SUBSCRIPTIONS_DAYS)
        with transaction.atomic():
            # settings
            user.save(update_fields=['settings'])
            # delete old subscription games
            self.delete_old(UserRecommendation.SOURCES_SUBSCRIBE, user.id, subscription_days)
            # delete all old similar games
            self.delete_old(UserRecommendation.SOURCES_LIBRARY_SIMILAR, user.id, now_date)
            # write user recommendations
            copy_from_conflict(
                UserRecommendation,
                ['user_id', 'game_id', 'sources', 'created', 'updated', 'position', 'hidden', 'related_ids'],
                records,
                '(user_id, game_id) DO UPDATE SET '
                'sources = ARRAY(SELECT DISTINCT UNNEST(a.sources || EXCLUDED.sources)), '
                'updated = EXCLUDED.updated, '
                f'position = (CASE WHEN a.position > {START_POSITION} THEN EXCLUDED.position ELSE a.position END), '
                'related_ids = ARRAY(SELECT DISTINCT UNNEST(a.related_ids || EXCLUDED.related_ids))',
                f'temp_recommendations_users_meta_{user.id}',
                join=f'JOIN {Game._meta.db_table} ON {Game._meta.db_table}.id = game_id'
            )
            # move recent subscription games to bottom
            data = []
            for row in UserRecommendation.objects.visible().only('id', 'position').filter(
                user_id=user.id,
                updated__lt=now_date,
                updated__gte=subscription_days,
                sources=[UserRecommendation.SOURCES_SUBSCRIBE]
            ):
                position += 1
                if row.position != position:
                    row.position = position
                data.append(row)
            UserRecommendation.objects.bulk_update(data, ['position'])

    def delete_old(self, target_source, user_id, updated):
        for user_recommendation in UserRecommendation.objects.visible().filter(
            sources__overlap=[target_source],
            user_id=user_id,
            updated__lt=updated,
        ):
            user_recommendation.sources = [source for source in user_recommendation.sources if source != target_source]
            if not user_recommendation.sources:
                user_recommendation.delete()
            else:
                user_recommendation.save(update_fields=['sources'])

    def print(self, text, style='SUCCESS', disable=False):
        if disable:
            return
        self.stdout.write(getattr(self.style, style)(text))
