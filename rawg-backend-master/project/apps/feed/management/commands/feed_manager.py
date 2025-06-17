from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.models import Q
from django.db.models.signals import post_save
from django.utils.timezone import now
from psycopg2 import sql

from apps.common.cache import CommonContentType
from apps.discussions.models import Discussion
from apps.feed.feed import most_rated_games, offer_change_playing, offer_rate_game, popular_games
from apps.feed.models import Feed, FeedElement, FeedQueue, UserFeed, UserNotifyFeed, UserReaction
from apps.feed.signals import MODELS_CREATED, MODELS_OPTIONS, instance_saved, language_detected
from apps.games.models import Game
from apps.reviews.models import Review
from apps.users.models import UserFollowElement, UserGame


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('--weeks', action='store', dest='weeks', default=0, type=int)
        parser.add_argument('--limit', action='store', dest='limit', default=0, type=int)
        # parser.add_argument('--delete-feed', action='store_true', dest='delete_feed', default=False)
        parser.add_argument('--truncate-all', action='store_true', dest='truncate_all', default=False)
        parser.add_argument('--fill-feed', action='store_true', dest='fill_feed', default=False)
        parser.add_argument('--fill-users-by-community', action='store_true', dest='users_by_community', default=False)
        parser.add_argument('--fill-games-by-community', action='store_true', dest='games_by_community', default=False)
        parser.add_argument(
            '--fill-offer-change-playing', action='store_true', dest='offer_change_playing', default=False
        )
        parser.add_argument('--fill-offer-rate-game', action='store_true', dest='offer_rate_game', default=False)
        parser.add_argument('--fill-popular-games', action='store_true', dest='popular_games', default=False)
        parser.add_argument('--fill-most-rated-games', action='store_true', dest='most_rated_games', default=False)
        parser.add_argument('--fill-popular-reviews', action='store_true', dest='popular_reviews', default=False)
        parser.add_argument(
            '--fill-popular-discussions', action='store_true', dest='popular_discussions', default=False
        )

    def fill_feed(self, weeks, exclude_existed=False):
        for model in MODELS_CREATED:
            model_options = MODELS_OPTIONS.get(model) or {}

            qs = model_options.get('qs', model.objects)
            if getattr(model, 'hidden', None):
                qs = qs.filter(hidden=False)
            else:
                qs = qs.all()
            if exclude_existed:
                qs = qs.exclude(id__in=FeedQueue.objects.filter(
                    content_type_id=CommonContentType().get(model).id,
                    action=FeedQueue.ADDITION
                ).values_list('object_id', flat=True))
            if weeks != -1:
                if getattr(model, 'created', None):
                    qs = qs.filter(created__gte=weeks)
                else:
                    qs = qs.filter(added__gte=weeks)

            created = model_options.get('created', True)
            lang = model_options.get('language')
            count = qs.count()
            for instance in qs.order_by('-id'):
                for key, value in model_options.get('instance', {}).items():
                    setattr(instance, key, value)
                instance_saved.send(sender=instance.__class__, instance=instance, created=created, old=True)
                if lang and instance.language:
                    data = lang(instance)
                    data['language'] = instance.language
                    language_detected.send(sender=instance.__class__, instance=instance, old=True, **data)

            self.stdout.write(self.style.SUCCESS('FILL FeedQueue {} {}'.format(model.__name__, count)))

        call_command('feed', old=True)

        FeedQueue.objects.filter(old=True).update(old=False)

    def users_by_community(self, limit, exclude_existed=False):
        count = Feed.FOLLOW_USER_COMMUNITY['count']
        days = Feed.FOLLOW_USER_COMMUNITY['days']
        users = get_user_model().objects.only('id').filter(followers_count__gte=count).order_by('-id')
        if exclude_existed:
            users = users.exclude(id__in=FeedElement.objects.filter(
                content_type_id=CommonContentType().get(get_user_model()).id,
                action=Feed.ACTIONS_FOLLOW_USER_COMMUNITY
            ).values_list('object_id', flat=True))
        if limit:
            users = users[0:limit]
        self.stdout.write(self.style.SUCCESS('FILL FOLLOW_USER_COMMUNITY {} users'.format(users.count())))
        for user in users:
            user_follows = UserFollowElement.objects \
                .filter(object_id=user.id, content_type=CommonContentType().get(get_user_model())) \
                .order_by('added') \
                .only('id', 'added')
            dates = []
            for i, user_follow in enumerate(user_follows):
                dates.append(user_follow.added)
                if i < count:
                    continue
                if (user_follow.added - dates[-count]).days > days:
                    continue
                FeedElement.objects.get_or_create(
                    content_type_id=CommonContentType().get(get_user_model()).id,
                    object_id=user.id,
                    action=Feed.ACTIONS_FOLLOW_USER_COMMUNITY,
                    defaults={'created': user_follow.added}
                )
                self.stdout.write(self.style.SUCCESS('FILL FOLLOW_USER_COMMUNITY {}'.format(user.id)))
                break

    def games_by_community(self, limit, exclude_existed=False):
        count = Feed.MARK_GAME_COMMUNITY['count']
        days = Feed.MARK_GAME_COMMUNITY['days']
        games = Game.objects.only('id').filter(added__gte=count).order_by('-id')
        if exclude_existed:
            games = games.exclude(id__in=FeedElement.objects.filter(
                content_type_id=CommonContentType().get(Game).id,
                action=Feed.ACTIONS_MARK_GAME_COMMUNITY
            ).values_list('object_id', flat=True))
        if limit:
            games = games[0:limit]
        self.stdout.write(self.style.SUCCESS('FILL MARK_GAME_COMMUNITY {} games'.format(games.count())))
        for game in games:
            user_games = UserGame.objects \
                .visible().filter(game_id=game.id) \
                .order_by('created') \
                .only('id', 'created')
            dates = []
            for i, user_game in enumerate(user_games):
                dates.append(user_game.created)
                if i < count:
                    continue
                if (user_game.created - dates[-count]).days > days:
                    continue
                FeedElement.objects.get_or_create(
                    content_type_id=CommonContentType().get(Game).id,
                    object_id=game.id,
                    action=Feed.ACTIONS_MARK_GAME_COMMUNITY,
                    defaults={'created': user_game.created}
                )
                self.stdout.write(self.style.SUCCESS('FILL MARK_GAME_COMMUNITY {}'.format(game.id)))
                break

    def popular_reviews(self):
        reviews = Review.objects.visible().only('id').filter(
            Q(comments_count__gte=Feed.REVIEWS_DISCUSSIONS_COMMUNITY['comments'])
            | Q(likes_positive__gte=Feed.REVIEWS_DISCUSSIONS_COMMUNITY['likes']),
            is_text=True
        ).order_by('-id')
        self.stdout.write(self.style.SUCCESS('FILL ADD_REVIEW {} reviews'.format(reviews.count())))
        for review in reviews:
            FeedElement.objects.get_or_create(
                content_type_id=CommonContentType().get(Review).id,
                action=Feed.ACTIONS_ADD_REVIEW,
                object_id=review.id,
                user__isnull=False,
                defaults={'created': review.created}
            )
            self.stdout.write(self.style.SUCCESS('FILL ADD_REVIEW {}'.format(review.id)))

    def popular_discussions(self):
        discussions = Discussion.objects.visible().only('id').filter(
            comments_count__gte=Feed.REVIEWS_DISCUSSIONS_COMMUNITY['comments']
        ).order_by('-id')
        self.stdout.write(self.style.SUCCESS('FILL ADD_DISCUSSION {} discussions'.format(discussions.count())))
        for discussion in discussions:
            FeedElement.objects.get_or_create(
                content_type_id=CommonContentType().get(Discussion).id,
                action=Feed.ACTIONS_ADD_DISCUSSION,
                object_id=discussion.id,
                defaults={'created': discussion.created}
            )
            self.stdout.write(self.style.SUCCESS('FILL ADD_DISCUSSION {}'.format(discussion.id)))

    def delete_feed(self, weeks, options):
        # todo draft

        # save new elements
        new_user_feeds = []
        for user_feed in UserFeed.objects.filter(new=True):
            if not user_feed.feed.queue:
                continue
            row = {
                'user_id': user_feed.user_id,
                'feed__queue__content_type_id': user_feed.feed.queue.content_type_id,
                'feed__queue__object_id': user_feed.feed.queue.object_id,
                'feed__queue__action': user_feed.feed.queue.action,
            }
            self.stdout.write(self.style.WARNING(row))
            new_user_feeds.append(row)

        # generate new feed queue

        self.fill_feed(weeks)

        # restore from feed elements

        actions_exclude = [Feed.ACTIONS_FOLLOW_USER_COMMUNITY, Feed.ACTIONS_MARK_GAME_COMMUNITY]
        for feed_element in FeedElement.objects.exclude(action__in=actions_exclude):
            feed_element.old = True
            post_save.send(
                sender=feed_element.__class__, instance=feed_element, created=True,
                update_fields=None, raw=False, using=None,
            )
            self.stdout.write(self.style.SUCCESS('FILL FeedElement {}'.format(feed_element)))

        # restore follow users by community

        self.users_by_community(options['limit'])

        # restore mark games by community

        self.games_by_community(options['limit'])

        # restore new feeds

        for user_feed in new_user_feeds:
            UserFeed.objects.filter(**user_feed).update(new=True)
            self.stdout.write(self.style.SUCCESS(user_feed))

    def handle(self, *args, **options):
        if options['truncate_all']:
            tables = []
            for model in [UserReaction, UserFeed, UserNotifyFeed, Feed, FeedQueue, FeedElement]:
                tables.append(sql.Identifier(model._meta.db_table))
            run = sql.SQL('TRUNCATE {}').format(sql.SQL(', ').join(tables))
            with connection.cursor() as cursor:
                cursor.execute(run)
            self.stdout.write(self.style.SUCCESS('TRUNCATE ALL FROM FEED'))

        weeks = options['weeks']
        if weeks and weeks != -1:
            weeks = now() - timedelta(weeks=weeks)

        # if options['delete_feed'] and weeks:
        #     self.delete_feed(weeks, options)

        if options['fill_feed'] and weeks:
            self.fill_feed(weeks, exclude_existed=True)

        if options['users_by_community']:
            self.users_by_community(options['limit'], exclude_existed=True)

        if options['games_by_community']:
            self.games_by_community(options['limit'], exclude_existed=True)

        if options['most_rated_games']:
            most_rated_games()
            self.stdout.write(self.style.SUCCESS('FILL MOST_RATED_GAMES - OK'))

        if options['popular_games']:
            popular_games()
            self.stdout.write(self.style.SUCCESS('FILL POPULAR_GAMES - OK'))

        if options['offer_change_playing']:
            offer_change_playing()
            self.stdout.write(self.style.SUCCESS('FILL OFFER_TO_CHANGE_PLAYING - OK'))

        if options['offer_rate_game']:
            offer_rate_game()
            self.stdout.write(self.style.SUCCESS('FILL OFFER_TO_RATE_GAME - OK'))

        if options['popular_reviews']:
            self.popular_reviews()

        if options['popular_discussions']:
            self.popular_discussions()

        self.stdout.write(self.style.SUCCESS('OK'))
