import itertools
import timeit
from collections import Counter, OrderedDict
from datetime import timedelta
from math import ceil
from typing import Optional

import implicit
import numpy as np
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields.jsonb import KeyTextTransform
from django.db import transaction
from django.db.models import ExpressionWrapper, IntegerField
from django.utils.timezone import now
from scipy.sparse import csr_matrix
from tqdm import tqdm

from apps.discussions.models import Discussion
from apps.games.cache import GameGetMiddleAdded, GameGetMiddleAddedWishlist, GameGetTopAdded, GameGetTopAddedWishlist
from apps.games.models import Game
from apps.recommendations.management.commands.users_recommendations_meta import (
    MIN_ADDED, MIN_RATING, MIN_RELEASED, Command as BaseCommand,
)
from apps.recommendations.models import UserRecommendation, UserRecommendationDislike, UserRecommendationQueue
from apps.reviews.models import Like, Review
from apps.users.models import UserFavoriteGame, UserGame
from apps.utils.dates import midnight, yesterday
from apps.utils.db import Cast, copy_from_conflict
from apps.utils.dicts import find

MIN_GAMES_NUM = 10
GAMES_NUM = 100
USERS_NUM = 10
TRENDING_GAP = 6
TRENDING_TAIL = 5
TRENDING_TAIL_ALT_COUNT = 40
TRENDING_TAIL_ALT = 40


class Command(BaseCommand):
    help = 'Create users recommendations by collaborative filtering'
    bulk_count = 2000
    models = [
        ('ALS', implicit.als.AlternatingLeastSquares,
         {'factors': 16, 'use_native': True, 'use_cg': True, 'iterations': 30, 'calculate_training_loss': True}),
        ('BPR', implicit.bpr.BayesianPersonalizedRanking, {'factors': 63, 'verify_negative_samples': True}),
        ('COSINE', implicit.nearest_neighbours.CosineRecommender, {}),
    ]
    filter = {}
    compiled_models = None
    trending_games = None

    def handle(self, *args, **options):
        # reset params
        self.filter = {}

        # prefetch data
        if not self.iterations:
            if options['prefetch_top']:
                self.prefetch(only_top=True)
            elif options['prefetch']:
                self.prefetch()

        # reset models once a day
        if now() - midnight() < timedelta(minutes=5) and self.iterations > 50:
            self.iterations = 0
            self.compiled_models = None
            self.trending_games = None

        # get trending
        if not self.trending_games:
            top_wishlist = GameGetTopAddedWishlist().get()
            wishlist_top = (
                Game.objects.defer_all()
                .filter(
                    id__in=top_wishlist,
                    added_by_status__toplay__gt=GameGetMiddleAddedWishlist().get()
                )
                .order_by('-added_by_status__toplay')
            )
            other_top = (
                Game.objects.defer_all()
                    .annotate(
                    added_without_toplay=ExpressionWrapper(
                        Cast('added', type='INTEGER')
                        - Cast(KeyTextTransform('toplay', 'added_by_status'), type='INTEGER'),
                        output_field=IntegerField()
                    )
                )
                .filter(
                    id__in=set(GameGetTopAdded().get()).difference(top_wishlist),
                    added_without_toplay__gt=GameGetMiddleAdded().get()
                )
                .order_by('-added')
            )
            if wishlist_top.count():
                self.prefetch(qs=wishlist_top)
            if other_top.count():
                self.prefetch(qs=other_top)
            self.trending_games = [
                game for game in itertools.chain.from_iterable(itertools.zip_longest(wishlist_top, other_top)) if game
            ]

        # calculate models and data
        game_user_data = None
        if not self.compiled_models:
            game_user_data = self.prepare_csr()
            if game_user_data is not None:
                self.compiled_models = self.get_models(game_user_data)
                game_user_data = game_user_data.T.tocsr()

        # get qs
        qs = get_user_model().objects
        if options['queue']:
            del game_user_data
            user_ids = list(
                UserRecommendationQueue.objects
                .filter(target=UserRecommendationQueue.TARGETS_COLLABORATIVE, datetime__lte=now())
                .values_list('user_id', flat=True)
            )
            if user_ids:
                qs = qs.filter(id__in=user_ids)
                self.filter = {'user_id__in': user_ids}
                game_user_data = self.prepare_csr()
                if game_user_data is not None:
                    game_user_data = game_user_data.T.tocsr()
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

        # process users
        self.print('Users', 'WARNING', disable=self.disable_tqdm)
        for user in tqdm(
            qs.only('id', 'settings').order_by('id').iterator(),
            total=qs.count(),
            disable=self.disable_tqdm
        ):
            start = None
            if self.disable_tqdm:
                start = timeit.default_timer()
            if game_user_data is not None:
                user_id = user.id
                recommendations = {}
                similar_users = {}
                for name, model in self.compiled_models:
                    kwargs = {'filter_already_liked_items': True}
                    if options['queue'] and name != 'BPR':
                        kwargs['recalculate_user'] = True
                    try:
                        user_data = model.recommend(user_id, game_user_data, GAMES_NUM, **kwargs)
                    except IndexError:
                        # the user is new
                        user_id = 0
                        try:
                            game_user_data = game_user_data.getrow(user.id)
                        except IndexError:
                            # the user is created after game_user_data creation
                            # this occurs in full recalculating and it's ok
                            continue
                        try:
                            user_data = model.recommend(user_id, game_user_data, GAMES_NUM, **kwargs)
                        except IndexError:
                            # user's games are not in train data
                            self.compiled_models = None
                            self.print('The games rebuilding is needed', 'ERROR')
                            return
                    for game_id, score in user_data:
                        recommendations.setdefault(name, []).append((game_id, score))
                    if not user_id or name == 'COSINE':
                        continue
                    try:
                        user_data_users = model.similar_users(user_id, USERS_NUM * 2)
                    except IndexError:
                        continue
                    for pk, score in user_data_users:
                        if user_id == pk:
                            continue
                        similar_users.setdefault(user_id, []).append((pk, score))
                self.process_user_collaborative(user, recommendations, similar_users)
            UserRecommendationQueue.objects.filter(
                target=UserRecommendationQueue.TARGETS_COLLABORATIVE, user_id=user.id
            ).delete()
            if start:
                self.stdout.write(self.style.SUCCESS(
                    'User #{} - {:.2f}s'.format(user.id, timeit.default_timer() - start)
                ))
        self.print('OK', disable=self.disable_tqdm)

    def get_models(self, game_user_data):
        data = []
        for name, model, kwargs in self.models:
            self.print(f'Train Model {name}', 'WARNING')
            model = model(**kwargs)
            model.fit(game_user_data)
            data.append((name, model))
            self.print('OK')
        return data

    def prepare_csr(self) -> Optional[csr_matrix]:
        users = {}
        last_days = now() - timedelta(days=90)

        qs = UserGame.objects.visible().filter(**self.filter)
        self.print('UserGame', 'WARNING', disable=self.disable_tqdm)
        for user_id, game_id, date in tqdm(
            qs.values_list('user_id', 'game_id', 'added').iterator(),
            total=qs.count(), disable=self.disable_tqdm
        ):
            user = users.setdefault(user_id, {})
            val = user.get(game_id, 0) + 1
            if date >= last_days:
                val *= 2
            user[game_id] = val
        self.print('OK', disable=self.disable_tqdm)

        qs = Review.objects.visible().filter(**self.filter)
        self.print('Review', 'WARNING', disable=self.disable_tqdm)
        ratings_map = {
            1: -40,
            3: -30,
            4: 30,
            5: 40,
        }
        for user_id, game_id, rating, is_text, date in tqdm(
            qs.values_list('user_id', 'game_id', 'rating', 'is_text', 'created').iterator(),
            total=qs.count(), disable=self.disable_tqdm
        ):
            user = users.setdefault(user_id, {})
            val = ratings_map[rating]
            if is_text:
                val *= 2
            if date >= last_days:
                val *= 2
            user[game_id] = user.get(game_id, 0) + val
        self.print('OK', disable=self.disable_tqdm)

        qs = Like.objects.filter(**self.filter)
        self.print('Like', 'WARNING', disable=self.disable_tqdm)
        ratings_map = {
            -1: 15,
            -3: 15,
            -4: -15,
            -5: -15,
            1: -15,
            3: -15,
            4: 15,
            5: 15,
        }
        for user_id, game_id, positive, rating, date in tqdm(
            qs.values_list('user_id', 'review__game_id', 'positive', 'review__rating', 'added').iterator(),
            total=qs.count(), disable=self.disable_tqdm
        ):
            user = users.setdefault(user_id, {})
            rating = rating * (1 if positive else -1)
            val = ratings_map[rating]
            if date >= last_days:
                val *= 2
            user[game_id] = user.get(game_id, 0) + val
        self.print('OK', disable=self.disable_tqdm)

        qs = Discussion.objects.visible().filter(**self.filter)
        self.print('Discussion', 'WARNING', disable=self.disable_tqdm)
        for user_id, game_id, date in tqdm(
            qs.values_list('user_id', 'game_id', 'created').iterator(),
            total=qs.count(), disable=self.disable_tqdm
        ):
            user = users.setdefault(user_id, {})
            val = 20
            if date >= last_days:
                val *= 2
            user[game_id] = user.get(game_id, 0) + val
        self.print('OK', disable=self.disable_tqdm)

        qs = UserFavoriteGame.objects.filter(**self.filter)
        self.print('UserFavoriteGame', 'WARNING', disable=self.disable_tqdm)
        for user_id, game_id, date in tqdm(
            qs.values_list('user_id', 'game_id', 'created').iterator(),
            total=qs.count(), disable=self.disable_tqdm
        ):
            user = users.setdefault(user_id, {})
            val = 60
            if date >= last_days:
                val *= 2
            user[game_id] = user.get(game_id, 0) + val
        self.print('OK', disable=self.disable_tqdm)

        qs = UserRecommendationDislike.objects.filter(**self.filter)
        self.print('UserRecommendationDislike', 'WARNING', disable=self.disable_tqdm)
        for user_id, game_id, date in tqdm(
            qs.values_list('user_id', 'game_id', 'created').iterator(),
            total=qs.count(), disable=self.disable_tqdm
        ):
            user = users.setdefault(user_id, {})
            val = -60
            if date >= last_days:
                val *= 2
            user[game_id] = user.get(game_id, 0) + val
        self.print('OK', disable=self.disable_tqdm)

        if not users:
            return

        self.print('Create CSR', 'WARNING', disable=self.disable_tqdm)
        row = []
        col = []
        data = []
        for user_id, games in tqdm(users.items(), disable=self.disable_tqdm):
            for game_id, value in games.items():
                row.append(game_id)
                col.append(user_id)
                data.append(value)
        game_user_data = csr_matrix((np.array(data), (np.array(row), np.array(col))), dtype=np.float32)
        self.print('OK', disable=self.disable_tqdm)

        return game_user_data

    def process_user_collaborative(self, user, recommendations, similar_users):
        # process recommendations
        collaborative_games = Counter()
        collaborative_games_related_ids = {}
        collaborative_games_sources = {}
        for name, values in recommendations.items():
            for game_id, score in values:
                collaborative_games[game_id] += score
                collaborative_games_related_ids.setdefault(game_id, []).append(name)

        # get trending games
        trending_games = OrderedDict([(game.id, game) for game in self.trending_games])

        # prefetch games data
        if not self.prefetched:
            missed_games = set(collaborative_games) - self.game_added.keys()
            self.prefetch(qs=Game.objects.filter(id__in=missed_games), disable_tqdm=True)

        # get user's platforms
        platforms = find(user.settings, 'users_platforms', [])

        # get user's games
        user_games = set(UserGame.objects.visible().filter(user_id=user.id).values_list('game_id', flat=True))
        if not user_games:
            return

        # filter collaborative games
        for game_id in collaborative_games:
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

        # filter trending games
        for game_id in trending_games:
            if not self.game_platforms.get(game_id, set()).intersection(platforms):
                user_games.add(game_id)

        # filter games which the user already has in the library
        for game_id in user_games:
            del collaborative_games[game_id]
            try:
                del trending_games[game_id]
            except KeyError:
                pass

        # filter games which were in user's recommendations
        for game_id in UserRecommendation.objects.hidden().filter(user_id=user.id).values_list('game_id', flat=True):
            del collaborative_games[game_id]
            try:
                del trending_games[game_id]
            except KeyError:
                pass

        # limit collaborative games
        collaborative_games = [game_id for game_id, _ in collaborative_games.most_common(GAMES_NUM)]

        # don't show poor recommendations
        collaborative_games_count = len(collaborative_games)
        if collaborative_games_count < MIN_GAMES_NUM:
            return

        # exclude collaborative games from trending
        for game_id in collaborative_games:
            if game_id in trending_games:
                del trending_games[game_id]
                collaborative_games_sources[game_id] = [
                    UserRecommendation.SOURCES_COLLABORATIVE, UserRecommendation.SOURCES_TRENDING
                ]

        # get user's info
        now_date = now()
        if not user.settings:
            user.settings = dict()
        settings_path_cycle = 'recommendations_users_collaborative_cycle'
        settings_path_date = 'recommendations_users_collaborative_date'
        settings_path_count = 'recommendations_users_collaborative_count'
        cycle = user.settings.get(settings_path_cycle) or 0
        cycle += 1
        user.settings[settings_path_cycle] = cycle
        user.settings[settings_path_date] = now_date.isoformat()
        user.settings[settings_path_count] = len(collaborative_games)

        # process similar_users
        similar_users_top = Counter()
        for name, values in similar_users.items():
            for game_id, score in values:
                similar_users_top[game_id] += score
        similar_users_top = [
            {
                'percent': min(100, ceil(score * 20)), 'score': score,
                'user': int(user_id), 'games': user.get_similar_games(user_id)
            }
            for user_id, score in similar_users_top.most_common(USERS_NUM)
        ]
        user.set_statistics(['recommended_users'], recommended_users=similar_users_top, commit=False)

        # move new collaborative games to top and save old creating dates
        old_created = {}
        if cycle > 1:
            old_recommendations = list(
                UserRecommendation.objects.visible()
                .filter(
                    sources__overlap=[UserRecommendation.SOURCES_COLLABORATIVE, UserRecommendation.SOURCES_TRENDING],
                    user_id=user.id
                )
                .values_list('game_id', 'created')
            )
            if old_recommendations:
                old_created = dict(old_recommendations)
                old_recommendations_sorting = {game_id: i + 1 for i, (game_id, _) in enumerate(old_recommendations)}
                collaborative_games = sorted(
                    collaborative_games, key=lambda x: old_recommendations_sorting.get(x, 0)
                )
                trending_games = OrderedDict(sorted(
                    trending_games.items(), key=lambda x: old_recommendations_sorting.get(x[0], 0)
                ))

        # prepare for sql
        records = []
        position = 0
        trending_gap = 0
        for game_id in collaborative_games:
            position += 1
            sources = ','.join(collaborative_games_sources.get(game_id, [UserRecommendation.SOURCES_COLLABORATIVE]))
            records.append([
                user.id, game_id, '{{{}}}'.format(sources),
                old_created.get(game_id, now_date), now_date, position, False,
                '{{{}}}'.format(','.join(collaborative_games_related_ids.get(game_id, [])))
            ])
            trending_gap += 1
            if trending_gap == TRENDING_GAP and trending_games:
                position += 1
                game = trending_games.pop(list(trending_games.keys())[0])
                records.append([
                    user.id, game.id, '{{{}}}'.format(UserRecommendation.SOURCES_TRENDING),
                    old_created.get(game_id, now_date), now_date, position, False, '{}'
                ])
                trending_gap = 0
        counter = 0
        counter_limit = TRENDING_TAIL if collaborative_games_count > TRENDING_TAIL_ALT_COUNT else TRENDING_TAIL_ALT
        for game in trending_games.values():
            position += 1
            counter += 1
            records.append([
                user.id, game.id, '{{{}}}'.format(UserRecommendation.SOURCES_TRENDING),
                old_created.get(game.id, now_date), now_date, position, False, '{}'
            ])
            if counter == counter_limit:
                break

        # calculate recommendations platforms
        recommendations_platforms = set()
        for _, game_id, *_ in records:
            recommendations_platforms.update(self.game_platforms.get(game_id, set()))
        user.settings['recommendations_users_platforms'] = list(recommendations_platforms)

        # write all
        with transaction.atomic():
            # settings
            user.save(update_fields=['settings', 'statistics'])
            # delete all old trending games
            self.delete_old(UserRecommendation.SOURCES_TRENDING, user.id, now_date)
            # delete all old collaborative recommendations
            self.delete_old(UserRecommendation.SOURCES_COLLABORATIVE, user.id, now_date)
            # write user recommendations
            copy_from_conflict(
                UserRecommendation,
                ['user_id', 'game_id', 'sources', 'created', 'updated', 'position', 'hidden', 'related_ids'],
                records,
                '(user_id, game_id) DO UPDATE SET '
                'sources = ARRAY(SELECT DISTINCT UNNEST(a.sources || EXCLUDED.sources)), '
                'updated = EXCLUDED.updated, '
                'position = EXCLUDED.position, '
                'related_ids = ARRAY(SELECT DISTINCT UNNEST(a.related_ids || EXCLUDED.related_ids))',
                f'temp_recommendations_users_collaborative_{user.id}',
                join=f'JOIN {Game._meta.db_table} ON {Game._meta.db_table}.id = game_id'
            )
