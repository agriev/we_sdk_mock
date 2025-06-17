from bulk_update.helper import bulk_update
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection

from apps.games.models import Game


class Command(BaseCommand):
    help = 'Rebuild the games counts fields'

    def handle(self, *args, **options):
        counters_fields = [
            'collections_count_all', 'collections_counts', 'screenshots_count', 'movies_count', 'persons_count',
            'parent_achievements_count_all', 'achievements_count', 'parent_achievements_counts',
            'discussions_count_all', 'discussions_counts', 'reviews_text_count_all', 'reviews_text_counts',
            'ratings_count', 'parents_count', 'additions_count', 'game_series_count',
        ]
        collections_counts = []
        parent_achievements_counts = []
        discussions_counts = []
        reviews_text_counts = []
        for lang, _ in settings.LANGUAGES:
            lang = settings.LANGUAGES_2_TO_3[lang]
            collections_counts.append(f'''
                select sub.*, collections_counts, '{lang}' from (
                    select game_id, count(*) count
                    from games_collectiongame
                    left join games_collection on games_collectiongame.collection_id = games_collection.id
                    where language = '{lang}' and games_collection.is_private is false
                    and (games_collection.likes_users > 0 or games_collection.followers_count > 0)
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where
                    sub.count != (collections_counts->>'{lang}')::int
                    or collections_counts->>'{lang}' is null
            ''')
            parent_achievements_counts.append(f'''
                select sub.*, parent_achievements_counts, '{lang}' from (
                    select game_id, count(*) count
                    from achievements_parentachievement
                    where hidden = false and language = '{lang}' and game_id is not null
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where
                    sub.count != (parent_achievements_counts->>'{lang}')::int
                    or parent_achievements_counts->>'{lang}' is null
            ''')
            discussions_counts.append(f'''
                select sub.*,  discussions_counts, '{lang}' from (
                    select game_id, count(*) count
                    from discussions_discussion
                    where hidden = false and language = '{lang}'
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where
                    sub.count != (discussions_counts->>'{lang}')::int
                    or  discussions_counts->>'{lang}' is null
            ''')
            reviews_text_counts.append(f'''
                select sub.*,  reviews_text_counts, '{lang}' from (
                    select game_id, count(*) count
                    from reviews_review
                    where hidden = false and is_text = true and user_id is not null and language = '{lang}'
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where
                    sub.count != (reviews_text_counts->>'{lang}')::int
                    or reviews_text_counts->>'{lang}' is null
            ''')
        sql_queries = {
            'collections_count_all': '''
                select sub.*, collections_count_all, null from (
                    select game_id, count(*) count
                    from games_collectiongame
                    left join games_collection on games_collectiongame.collection_id = games_collection.id
                    where games_collection.is_private is false
                    and (games_collection.likes_users > 0 or games_collection.followers_count > 0)
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where sub.count != collections_count_all or collections_count_all is null
            ''',
            'collections_counts': ' union '.join(collections_counts),
            'screenshots_count': '''
                select sub.*, screenshots_count, null from (
                    select game_id, count(*) count
                    from games_screenshot
                    where hidden = false
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where sub.count != screenshots_count
            ''',
            'movies_count': '''
                select sub.*, movies_count, null from (
                    select game_id, count(*) count
                    from games_movie
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where sub.count != movies_count
            ''',
            'persons_count': '''
                select sub.*, persons_count, null from (
                    select subsub.game_id, count(*) from (
                        select game_id, person_id, count(*) count
                        from credits_gameperson
                        where hidden = false
                        group by 1, 2
                        order by 1, 2
                    ) subsub
                    group by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where sub.count != persons_count
            ''',
            'parent_achievements_count_all': '''
                select sub.*, parent_achievements_count_all, null from (
                    select game_id, count(*) count
                    from achievements_parentachievement
                    where hidden = false
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where sub.count != parent_achievements_count_all
            ''',
            'parent_achievements_counts': ' union '.join(parent_achievements_counts),
            'achievements_count': '''
                select sub.*, achievements_count, null from (
                    select game_id, count(*) count
                    from achievements_achievement
                    left join achievements_parentachievement
                        on achievements_achievement.parent_id = achievements_parentachievement.id
                    where achievements_achievement.hidden = false
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where sub.count != achievements_count
            ''',
            'discussions_count_all': '''
                select sub.*, discussions_count_all, null from (
                    select game_id, count(*) count
                    from discussions_discussion
                    where hidden = false
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where sub.count != discussions_count_all or discussions_count_all is null
            ''',
            'discussions_counts': ' union '.join(discussions_counts),
            'reviews_text_count_all': '''
                select sub.*, reviews_text_count_all, null from (
                    select game_id, count(*) count
                    from reviews_review
                    where hidden = false and is_text = true and user_id is not null
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where sub.count != reviews_text_count_all or reviews_text_count_all is null
            ''',
            'reviews_text_counts': ' union '.join(reviews_text_counts),
            'ratings_count': '''
                select sub.*, ratings_count, null from (
                    select game_id, count(*) count
                    from reviews_review
                    where hidden = false and is_text = false and user_id is not null
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where sub.count != ratings_count
            ''',
            'parents_count': '''
                select sub.*, parents_count, null from (
                    select game_id, count(*) count
                    from games_addition
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.game_id = games_game.id
                where sub.count != parents_count or parents_count is null
            ''',
            'additions_count': '''
                select sub.*, additions_count, null from (
                    select parent_game_id, count(*) count
                    from games_addition
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.parent_game_id = games_game.id
                where sub.count != additions_count or additions_count is null
            ''',
            'game_series_count': '''
                select sub.*, game_series_count, null from (
                    select from_game_id, count(*) count
                    from games_game_game_series
                    group by 1
                    order by 1
                ) sub
                left join games_game on sub.from_game_id = games_game.id
                where sub.count != game_series_count or game_series_count is null
            ''',
        }
        for field in counters_fields:
            self.stdout.write(self.style.SUCCESS(f'Processing {field}'))
            with connection.cursor() as cursor:
                cursor.execute(sql_queries[field])
                data = []
                for game_id, new_count, old_count, lang in cursor.fetchall():
                    game = Game()
                    game.id = game_id
                    if not lang:
                        setattr(game, field, new_count)
                    else:
                        if type(old_count) is not dict:
                            old_count = {}
                        old_count[lang] = new_count
                        setattr(game, field, old_count)
                    data.append(game)
            if data:
                bulk_update(data, update_fields=[field])
            self.stdout.write(self.style.SUCCESS(f'{field} - {len(data)}'))
        self.stdout.write(self.style.SUCCESS('OK'))
