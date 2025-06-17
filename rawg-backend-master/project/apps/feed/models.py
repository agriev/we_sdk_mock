import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.fields import ArrayField, JSONField
from django.contrib.postgres.indexes import GinIndex
from django.core.management import call_command
from django.db import IntegrityError, models, transaction
from django.db.models import ExpressionWrapper, F, IntegerField
from django.utils.timezone import now
from ordered_model.models import OrderedModel
from psycopg2 import errorcodes

from apps.common.cache import CommonContentType
from apps.feed.context import get_many_context, to_representation
from apps.games.models import Collection
from apps.users.models import UserFollowElement, UserGame
from apps.utils.db import copy_from_conflict
from apps.utils.fields.autoslug import CIAutoSlugField


class FeedManager(models.Manager):
    def prefetch(self):
        return self.get_queryset().prefetch_related('user')

    def create_followed_user(self, user_id, follow_id, queue, callback=None):
        return self._create(user_id, follow_id, Feed.ACTIONS_FOLLOW_USER, 'users', callback=callback, queue=queue)

    def create_followed_user_community(self, user_id, user_ids, queue):
        return self._create_custom(
            None, Feed.ACTIONS_FOLLOW_USER_COMMUNITY, {'users': self._ids([user_id] + user_ids)}, queue=queue
        )

    def create_marked_game(self, user_id, game_id, status, queue):
        return self._create_custom(user_id, Feed.ACTIONS_MARK_GAME, {'statuses': {status: self._ids(game_id)}},
                                   queue=queue)

    def create_marked_game_community(self, game_id, user_ids, queue):
        return self._create_custom(None, Feed.ACTIONS_MARK_GAME_COMMUNITY,
                                   {'games': self._ids(game_id), 'users': self._ids(user_ids)},
                                   queue=queue)

    def create_followed_collection(self, user_id, collection_id, creator_id, queue, callback=None):
        return self._create_custom(user_id, Feed.ACTIONS_FOLLOW_COLLECTION, {
            'collections': self._ids(collection_id),
            'collections_creators': self._ids(creator_id),
        }, callback=callback, queue=queue)

    def create_created_collection(self, user_id, collection_id, queue):
        return self._create(user_id, collection_id, Feed.ACTIONS_CREATE_COLLECTION, 'collections', queue=queue)

    def create_added_game_to_collection(self, user_id, collection_id, game_id, queue):
        return self._create_custom(user_id, Feed.ACTIONS_ADD_GAME_TO_COLLECTION, {
            'collections': self._ids(collection_id),
            'games': self._ids(game_id),
        }, queue=queue)

    def create_added_feed_to_collection(self, user_id, collection_id, feed_id, queue, game_id=None, review_id=None,
                                        discussion_id=None, comment_id=None):
        elements = {
            'collections': self._ids(collection_id),
            'collection_feeds': self._ids(feed_id),
        }
        if game_id:
            elements['games'] = self._ids(game_id)
        if review_id:
            elements['reviews'] = self._ids(review_id)
            if comment_id:
                elements['comments'] = {'commentreview': self._ids(comment_id)}
        if discussion_id:
            elements['discussions'] = self._ids(discussion_id)
            if comment_id:
                elements['comments'] = {'commentdiscussion': self._ids(comment_id)}
        return self._create_custom(user_id, Feed.ACTIONS_ADD_FEED_TO_COLLECTION, elements, queue=queue)

    def create_suggested_game_to_collection(self, user_id, collection_id, creator_id, game_id, queue, callback=None):
        return self._create_custom(user_id, Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION, {
            'collections': self._ids(collection_id),
            'games': self._ids(game_id),
            'collections_creators': self._ids(creator_id),
        }, callback=callback, queue=queue)

    def create_added_review(self, user_id, review_id, game_id, queue):
        if not user_id:
            return
        return self._create_custom(user_id, Feed.ACTIONS_ADD_REVIEW, {
            'reviews': self._ids(review_id),
            'games': self._ids(game_id),
        }, queue=queue)

    def create_added_discussion(self, user_id, discussion_id, game_id, queue):
        return self._create_custom(user_id, Feed.ACTIONS_ADD_DISCUSSION, {
            'discussions': self._ids(discussion_id),
            'games': self._ids(game_id),
        }, queue=queue)

    def create_added_comment(self, user_id, elements, queue):
        return self._create_custom(user_id, Feed.ACTIONS_ADD_COMMENT, elements, queue=queue)

    def create_favorite_comment(self, user_id, elements, queue):
        return self._create_custom(user_id, Feed.ACTIONS_FAVORITE_COMMENT, elements, queue=queue)

    def create_like(self, user_id, elements, queue):
        return self._create_custom(user_id, Feed.ACTIONS_LIKE, elements, queue=queue)

    def create_game_is_released(self, game_id, queue):
        return self._create_custom(None, Feed.ACTIONS_GAME_IS_RELEASED, {'games': self._ids(game_id)}, queue=queue)

    def create_offer_to_change_playing(self, game_id, user_id, queue):
        return self._create_custom(
            None, Feed.ACTIONS_OFFER_TO_CHANGE_PLAYING,
            {'games': self._ids(game_id), 'users': self._ids(user_id)}, queue=queue
        )

    def create_offer_to_rate_game(self, game_id, user_id, queue):
        return self._create_custom(
            None, Feed.ACTIONS_OFFER_TO_RATE_GAME,
            {'games': self._ids(game_id), 'users': self._ids(user_id)}, queue=queue
        )

    def create_popular_games(self, game_ids, games_count, users_count, platform, queue):
        return self._create_custom(
            None, Feed.ACTIONS_POPULAR_GAMES,
            {'games': self._ids(game_ids), 'games_count': games_count, 'users_count': users_count,
             'platform': {'id': platform.id, 'slug': platform.slug, 'name': platform.name}}, queue=queue
        )

    def create_most_rated_games(self, game_ids, games_count, users_count, queue):
        return self._create_custom(
            None, Feed.ACTIONS_MOST_RATED_GAMES,
            {'games': self._ids(game_ids), 'games_count': games_count, 'users_count': users_count}, queue=queue
        )

    def select_followed_user(self, user_id=None, **kwargs):
        return self._select(Feed.ACTIONS_FOLLOW_USER, user_id, **kwargs)

    def select_marked_game(self, user_id=None, **kwargs):
        return self._select(Feed.ACTIONS_MARK_GAME, user_id, **kwargs)

    def select_followed_collection(self, user_id=None, **kwargs):
        return self._select(Feed.ACTIONS_FOLLOW_COLLECTION, user_id, **kwargs)

    def select_created_collection(self, user_id=None, **kwargs):
        return self._select(Feed.ACTIONS_CREATE_COLLECTION, user_id, **kwargs)

    def select_added_game_to_collection(self, user_id=None, **kwargs):
        return self._select(Feed.ACTIONS_ADD_GAME_TO_COLLECTION, user_id, **kwargs)

    def select_added_feed_to_collection(self, user_id=None, **kwargs):
        return self._select(Feed.ACTIONS_ADD_FEED_TO_COLLECTION, user_id, **kwargs)

    def select_suggested_game_to_collection(self, user_id=None, **kwargs):
        return self._select(Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION, user_id, **kwargs)

    def select_added_review(self, user_id=None, **kwargs):
        return self._select(Feed.ACTIONS_ADD_REVIEW, user_id, **kwargs)

    def select_added_discussion(self, user_id=None, **kwargs):
        return self._select(Feed.ACTIONS_ADD_DISCUSSION, user_id, **kwargs)

    def select_added_comment(self, user_id=None, **kwargs):
        return self._select(Feed.ACTIONS_ADD_COMMENT, user_id, **kwargs)

    def _ids(self, objects_id):
        if type(objects_id) is not list:
            objects_id = [objects_id]
        return [int(x) for x in objects_id]

    def _create(self, user_id, objects_id, action, name, callback=None, queue=None):
        return self._create_custom(user_id, action, {name: self._ids(objects_id)}, callback=callback, queue=queue)

    def _create_custom(self, user_id, action, data, callback=None, queue=None):
        feed = Feed()
        feed.user_id = user_id
        feed.action = action
        feed.data = data
        feed.set_user_feed_as_new = True
        if queue:
            if queue.id:
                feed.queue = queue
            feed.skip_auto_now = True
            feed.created = queue.created
            feed.set_user_feed_as_new = not queue.old
        feed.callback = callback
        feed.save()
        return feed

    def _select(self, action, user_id=None, **kwargs):
        filters = {'action': action}
        if user_id:
            filters['user_id'] = user_id
        if kwargs:
            filters.update(kwargs)
        return self.get_queryset().select_for_update().filter(**filters)


class Feed(models.Model):
    ACTIONS_FOLLOW_USER = 'followed_user'
    ACTIONS_FOLLOW_USER_COMMUNITY = 'followed_user_community'
    ACTIONS_MARK_GAME = 'marked_game'
    ACTIONS_MARK_GAME_COMMUNITY = 'marked_game_community'
    ACTIONS_FOLLOW_COLLECTION = 'followed_collection'
    ACTIONS_CREATE_COLLECTION = 'created_collection'
    ACTIONS_ADD_GAME_TO_COLLECTION = 'added_game_to_collection'
    ACTIONS_ADD_FEED_TO_COLLECTION = 'added_feed_to_collection'
    ACTIONS_SUGGEST_GAME_TO_COLLECTION = 'suggested_game_to_collection'
    ACTIONS_ADD_REVIEW = 'added_review'
    ACTIONS_ADD_DISCUSSION = 'added_discussion'
    ACTIONS_ADD_COMMENT = 'added_comment'
    ACTIONS_FAVORITE_COMMENT = 'favorite_comment'
    ACTIONS_LIKE = 'like'
    ACTIONS_GAME_IS_RELEASED = 'game_is_released'
    ACTIONS_OFFER_TO_CHANGE_PLAYING = 'offer_change_playing'
    ACTIONS_OFFER_TO_RATE_GAME = 'offer_rate_game'
    ACTIONS_POPULAR_GAMES = 'popular_games'
    ACTIONS_MOST_RATED_GAMES = 'most_rated_games'
    ACTIONS = (
        (ACTIONS_FOLLOW_USER, 'Followed users'),
        (ACTIONS_FOLLOW_USER_COMMUNITY, 'Followed users by community'),
        (ACTIONS_MARK_GAME, 'Marked games'),
        (ACTIONS_MARK_GAME_COMMUNITY, 'Marked games by community'),
        (ACTIONS_FOLLOW_COLLECTION, 'Followed collections'),
        (ACTIONS_CREATE_COLLECTION, 'Created collections'),
        (ACTIONS_ADD_GAME_TO_COLLECTION, 'Added games to a collection'),
        (ACTIONS_ADD_FEED_TO_COLLECTION, 'Added a feed to a collection'),
        (ACTIONS_SUGGEST_GAME_TO_COLLECTION, 'Suggested games to a collection'),
        (ACTIONS_ADD_REVIEW, 'Added a review to a game'),
        (ACTIONS_ADD_DISCUSSION, 'Added a discussion to a game'),
        (ACTIONS_ADD_COMMENT, 'Added a new comment'),
        (ACTIONS_FAVORITE_COMMENT, 'Favorite a comment'),
        (ACTIONS_LIKE, 'Like'),
        (ACTIONS_GAME_IS_RELEASED, 'Game is released'),
        (ACTIONS_OFFER_TO_CHANGE_PLAYING, 'Offer to change a playing status'),
        (ACTIONS_OFFER_TO_RATE_GAME, 'Offer to rate a game'),
        (ACTIONS_POPULAR_GAMES, 'Popular games'),
        (ACTIONS_MOST_RATED_GAMES, 'Most rated games'),
    )
    ACTIONS_HIDDEN = (ACTIONS_ADD_COMMENT, ACTIONS_FAVORITE_COMMENT, ACTIONS_LIKE)
    ACTIONS_FOR_FOLLOWERS_OF_GAME = (ACTIONS_ADD_DISCUSSION, ACTIONS_ADD_REVIEW)
    ACTIONS_FOR_FOLLOWERS_OF_COLLECTION = (
        ACTIONS_CREATE_COLLECTION, ACTIONS_SUGGEST_GAME_TO_COLLECTION, ACTIONS_ADD_GAME_TO_COLLECTION
    )
    ON_PAGE = 10
    LIMIT_ELEMENTS_LIST = 6
    LIMIT_ELEMENTS_SINGLE = 30
    GROUP_MINUTES = 15
    MIN_GAMES_FOR_FEED = 3
    COLLECTION_TIME = 60
    GAME_STATUSES = (UserGame.STATUS_PLAYING, UserGame.STATUS_BEATEN)
    MARK_GAME_COMMUNITY = {'count': 30, 'days': 3}
    FOLLOW_USER_COMMUNITY = {'count': 10, 'days': 3}
    REVIEWS_DISCUSSIONS_COMMUNITY = {'comments': 0, 'likes': 0}
    OFFER_TO_CHANGE_PLAYING_DAYS = 30
    OFFER_TO_RATE_GAME_DAYS = 3

    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, blank=True, default=None, null=True)
    created = models.DateTimeField(db_index=True)
    action = models.CharField(choices=ACTIONS, default=ACTIONS_MARK_GAME, max_length=30, db_index=True)
    language = models.CharField(max_length=3, default='-', db_index=True, editable=False)
    data = JSONField()
    reactions = JSONField(blank=True, default=None, null=True)
    queue = models.ForeignKey('FeedQueue', models.CASCADE, default=None, null=True)

    objects = FeedManager()
    new_element_was_saved = False
    new_element_was_deleted = False
    skip_auto_now = False
    set_user_feed_as_new = True
    callback = None

    def get_context(self, context=None):
        self.get_many_context([self], context, [self.user] if self.user else [], self.LIMIT_ELEMENTS_SINGLE)

    def add(self, object_id, elements, group=None, time=None, commit=True, callback=None, user_feed_as_new=True,
            check_exist=True):
        self.set_user_feed_as_new = user_feed_as_new
        if group:
            groups = self.data.get(elements) or {}
            ids = groups.get(group) or []
            if (check_exist and object_id not in ids) or not check_exist:
                ids.append(object_id)
                self.new_element_was_saved = True
            groups[group] = ids
            self.data[elements] = groups
        else:
            ids = self.data.get(elements) or []
            if (check_exist and object_id not in ids) or not check_exist:
                ids.append(object_id)
                self.new_element_was_saved = True
            self.data[elements] = ids
        if commit:
            if time and time > self.created:
                self.created = time
            self.callback = callback
            self.save()

    def subtract(self, object_id, elements, group=None, commit=True, callback=None, only_one=False):
        deleted = False
        self.new_element_was_deleted = callback if callback else True
        if group:
            groups = self.data.get(elements) or {}
            ids = groups.get(group) or []
            groups[group] = self.exclude(ids, object_id, only_one)
            if not groups[group]:
                del groups[group]
            self.data[elements] = groups
            if commit:
                if not groups or not max([len(items) for items in groups.values()]):
                    self.delete()
                    deleted = True
                else:
                    self.save()
        else:
            self.data[elements] = self.exclude(self.data[elements], object_id, only_one)
            if commit:
                if not self.data[elements]:
                    self.delete()
                    deleted = True
                else:
                    self.save()
        return deleted

    def exclude(self, elements, object_id, only_one):
        result = []
        find = False
        for pk in elements:
            if pk == object_id and ((only_one and not find) or not only_one):
                find = True
                continue
            result.append(pk)
        return result

    def save(self, *args, **kwargs):
        if not self.skip_auto_now and not self.id:
            self.created = now()
        super().save(*args, **kwargs)

    @classmethod
    def get_many_context(cls, feeds, context, additional_users=None, limit=None):
        if not limit:
            limit = cls.LIMIT_ELEMENTS_LIST
        get_many_context(feeds, context, additional_users, limit)

    @classmethod
    def to_representation(cls, data, instance, context):
        data = to_representation(data, context)

        if data['action'] == Feed.ACTIONS_MARK_GAME:
            result = {}
            statuses = context['feed_statuses'].get(data['id'])
            counts = context['feed_counts_statuses'].get(data['id'])
            if statuses:
                games = {game['id']: game for game in data['games']['results']}
                for status, ids in statuses.items():
                    result[status] = {
                        'count': counts[status],
                        'results': [games[pk] for pk in ids if games.get(pk)],
                    }
                data['statuses'] = result
                data['status'] = list(statuses.keys())[0]
            else:
                # https://github.com/behindthegames/rawg/issues/202
                data['games'] = {'count': 0}
                data['statuses'] = {'': {'results': [], 'count': 0}}

        comments = (data.get('comments') or {}).get('results')
        if data['action'] in (Feed.ACTIONS_ADD_COMMENT, Feed.ACTIONS_FAVORITE_COMMENT) and comments:
            data['model'] = comments[0]['model']

        if data['action'] == Feed.ACTIONS_ADD_COMMENT:
            data['reply_to_your'] = data['comments']['count'] == 1 or (
                data['comments']['results'][1]['user_id'] == context['request'].user.id
            )

        if data['action'] == Feed.ACTIONS_LIKE:
            data['model'] = None
            if data.get('collections'):
                data['model'] = 'collection'
            data['likes_count'] = instance.data.get('likes_count') or 1

        if data['action'] == Feed.ACTIONS_FOLLOW_USER_COMMUNITY:
            data['follow'] = {
                'count': 1,
                'results': [data['users']['results'].pop()]
            }

        if data['action'] in (Feed.ACTIONS_POPULAR_GAMES, Feed.ACTIONS_MOST_RATED_GAMES):
            data['users_count'] = instance.data.get('users_count')
            data['games_count'] = instance.data.get('games_count')

        if data['action'] == Feed.ACTIONS_POPULAR_GAMES:
            data['platform'] = instance.data.get('platform')

        collection_feeds = (data.get('collection_feeds') or {}).get('results')
        if data['action'] == Feed.ACTIONS_ADD_FEED_TO_COLLECTION and collection_feeds:
            data['type'] = collection_feeds[0]['type']

        return data

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Feed'
        verbose_name_plural = 'Feeds'
        ordering = ('-created', '-id')
        indexes = [
            GinIndex(fields=['data']),
        ]


class UserFeedManager(models.Manager):
    def prefetch(self):
        return self.get_queryset().prefetch_related('feed', 'feed__user')

    def create_from_feed(self, feed, update=False):
        # create events for followers of the game
        if feed.action in Feed.ACTIONS_FOR_FOLLOWERS_OF_GAME:
            # we can do it instead
            # `UserFeed.objects.create_user_feed(user_id, feed, self.model.SOURCES_GAME, update=update)`
            # because we can just append the `UserFeed.SOURCES_GAME` source to this user feed
            records = []
            qs = UserGame.objects.filter(hidden=False, game_id=feed.data['games'][0])
            for user_id in qs.values_list('user_id', flat=True):
                if user_id == feed.user_id:
                    continue
                records.append([
                    user_id, feed.id, '{{{}}}'.format(UserFeed.SOURCES_GAME), feed.set_user_feed_as_new,
                    feed.created.isoformat(), False
                ])
            if records:
                copy_from_conflict(
                    UserFeed, ['user_id', 'feed_id', 'sources', 'new', 'created', 'hidden'], records,
                    "(user_id, feed_id) DO UPDATE SET sources = "
                    "ARRAY(SELECT DISTINCT UNNEST(a.sources || EXCLUDED.sources))",
                    'temp_user_feed_game_{}'.format(feed.id)
                )
            if not Feed.REVIEWS_DISCUSSIONS_COMMUNITY['comments'] and not Feed.REVIEWS_DISCUSSIONS_COMMUNITY['likes']:
                # todo delete after reverting https://github.com/behindthegames/rawg/issues/499
                from apps.reviews.models import Review
                from apps.discussions.models import Discussion
                from apps.feed.signals import community

                name = 'reviews' if feed.action == Feed.ACTIONS_ADD_REVIEW else 'discussions'
                sender = Review if feed.action == Feed.ACTIONS_ADD_REVIEW else Discussion
                community(
                    feed.data[name][0],
                    sender,
                    feed.action,
                    now(),
                )
        # create events for followers of the collection
        if feed.action in Feed.ACTIONS_FOR_FOLLOWERS_OF_COLLECTION:
            pk = feed.data['collections'][0]
            for user_id in UserFollowElement.objects.filter(
                object_id=pk, content_type=CommonContentType().get(Collection)
            ).values_list('user_id', flat=True):
                UserFeed.objects.create_user_feed(user_id, feed, UserFeed.SOURCES_COLLECTION, update=update)
        if feed.user:
            # create events for following users
            for user_id in UserFollowElement.objects.filter(
                object_id=feed.user_id, content_type=CommonContentType().get(get_user_model())
            ).values_list('user_id', flat=True):
                UserFeed.objects.create_user_feed(user_id, feed, update=update)
            # create an event for a current user
            UserFeed.objects.create_user_feed(feed.user_id, feed, update=update)

    def update_from_feed(self, feed):
        self.create_from_feed(feed, feed.new_element_was_deleted)
        if feed.new_element_was_saved:
            self.get_queryset().filter(feed=feed).update(new=feed.set_user_feed_as_new, created=feed.created)

    def create_user_feed(self, user_id, feed, source=None, update=False):
        if not source:
            source = self.model.SOURCES_USER

        if feed.action in Feed.ACTIONS_HIDDEN:
            return

        defaults = {'created': feed.created, 'sources': [source], 'new': feed.set_user_feed_as_new}
        try:
            with transaction.atomic():
                instance = self.get_queryset().get_or_create(user_id=user_id, feed=feed, defaults=defaults)[0]
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
            try:
                instance = self.get_queryset().get(user_id=user_id, feed=feed)
            except self.model.DoesNotExist:
                return

        if self.only_notify_cases(feed, user_id):
            instance.delete()
            return

        if source not in instance.sources:
            instance.sources.append(source)
            instance.save(update_fields=['sources'])

        return instance

    def delete_source(self, source, **kwargs):
        for user_feed in self.get_queryset().filter(sources__contains=[source], **kwargs):
            user_feed.sources = [s for s in user_feed.sources if source != s]
            if user_feed.sources:
                user_feed.save()
            else:
                user_feed.delete()

    def only_notify_cases(self, feed, user_id):
        # notification about following
        if feed.action == Feed.ACTIONS_FOLLOW_USER and feed.data['users'] == [user_id]:
            return True
        # notification about collection following
        if feed.action == Feed.ACTIONS_FOLLOW_COLLECTION and feed.data['collections_creators'] == [user_id]:
            return True
        # notification about collection suggesting
        if feed.action == Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION and feed.data['collections_creators'] == [user_id]:
            return True
        return False


class UserFeed(models.Model):
    SOURCES_USER = 'user'
    SOURCES_GAME = 'game'
    SOURCES_COMMON = 'common'
    SOURCES_RECOMMEND = 'recommend'
    SOURCES_COLLECTION = 'collection'
    SOURCES = (
        (SOURCES_USER, 'User'),
        (SOURCES_GAME, 'Game'),
        (SOURCES_COMMON, 'Common'),
        (SOURCES_RECOMMEND, 'Recommend'),
        (SOURCES_COLLECTION, 'Collection'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, default=None, null=True)
    feed = models.ForeignKey(Feed, models.CASCADE)
    created = models.DateTimeField(db_index=True)
    new = models.BooleanField(default=True, db_index=True)
    sources = ArrayField(models.CharField(max_length=10), default=list)
    hidden = models.BooleanField(default=False, db_index=True)

    objects = UserFeedManager()

    @classmethod
    def to_representation(cls, data, instance, context):
        data['feed']['sources'] = instance.sources
        data['feed']['new'] = data['new']
        return data['feed']

    def __str__(self):
        return str(self.id)

    class Meta:
        ordering = ('-created', '-id')
        verbose_name = 'User Feed'
        verbose_name_plural = 'User Feeds'
        unique_together = ('user', 'feed')


class UserNotifyFeedManager(models.Manager):
    def prefetch(self):
        return self.get_queryset().prefetch_related('feed', 'feed__user')

    def create_user_notify_feed(self, user_id, feed):
        defaults = {'created': feed.created, 'new': feed.set_user_feed_as_new}
        try:
            with transaction.atomic():
                instance = self.get_queryset().get_or_create(user_id=user_id, feed=feed, defaults=defaults)[0]
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
            try:
                instance = self.get_queryset().get(user_id=user_id, feed=feed)
            except self.model.DoesNotExist:
                return
        return instance


class UserNotifyFeed(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    feed = models.ForeignKey(Feed, models.CASCADE)
    created = models.DateTimeField(db_index=True)
    new = models.BooleanField(default=True, db_index=True)

    objects = UserNotifyFeedManager()

    @classmethod
    def to_representation(cls, data, instance, context):
        data['feed']['new'] = data['new']
        return data['feed']

    def __str__(self):
        return str(self.id)

    class Meta:
        ordering = ('-created', '-id')
        verbose_name = 'User Notify Feed'
        verbose_name_plural = 'User Notify Feeds'
        unique_together = ('user', 'feed')


class FeedQueueManager(models.Manager):
    def create_queue(self, instance, pk, action, kwargs, created=None, old=False, status=None):
        obj = self.model()
        obj.content_type = CommonContentType().get(instance)
        obj.object_id = pk
        obj.action = action
        obj.data = kwargs
        if created:
            obj.skip_auto_now = True
            obj.created = created
            obj.execute = now()
        obj.old = old
        if status:
            obj.status = status
        obj.save()
        if settings.ENVIRONMENT == 'TESTS':
            # todo move to mock
            with open(os.devnull, 'w') as f:
                kwargs = {}
                if settings.TESTS_ENVIRONMENT != 'DOCKER':
                    kwargs['stdout'] = f
                call_command('feed', **kwargs)
        return obj


class FeedQueue(models.Model):
    ADDITION = 'a'
    DELETION = 'd'
    LANGUAGE = 'l'
    ACTIONS = (
        (ADDITION, 'Addition'),
        (DELETION, 'Deletion'),
        (LANGUAGE, 'Language'),
    )
    NEW = 'n'
    STARTED = 's'
    FINISHED = 'f'
    DELAY = 'd'
    EMPTY = 'e'
    ERROR = 'x'
    STATUSES = (
        (NEW, 'New'),
        (STARTED, 'Started'),
        (FINISHED, 'Finished'),
        (DELAY, 'Delay'),
        (EMPTY, 'Empty'),
        (ERROR, 'Error'),
    )
    content_type = models.ForeignKey(ContentType, models.CASCADE)
    object_id = models.PositiveIntegerField()
    action = models.CharField(choices=ACTIONS, max_length=1)
    data = JSONField(blank=True, default=None, null=True)
    status = models.CharField(choices=STATUSES, db_index=True, default=NEW, max_length=1)
    created = models.DateTimeField()
    execute = models.DateTimeField()
    updated = models.DateTimeField(auto_now=True)
    duration = models.PositiveIntegerField(default=0)
    retries = models.PositiveIntegerField(default=0)
    old = models.BooleanField(default=False)

    content_object = GenericForeignKey('content_type', 'object_id')
    objects = FeedQueueManager()
    skip_auto_now = False

    def save(self, *args, **kwargs):
        if not self.skip_auto_now and not self.id:
            self.created = now()
            self.execute = self.created
        super().save(*args, **kwargs)

    @classmethod
    def feed_qs(cls, processes, process_num, old=False):
        mod = ExpressionWrapper((F('id') + F('retries')) % processes, output_field=IntegerField())
        return cls.objects \
            .annotate(mod=mod) \
            .filter(mod=process_num, status__in=[cls.NEW, cls.DELAY], execute__lte=now(), old=old) \
            .order_by('id')

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Feed Queue'
        verbose_name_plural = 'Feed Queue'
        ordering = ('id',)


class FeedElement(models.Model):
    content_type = models.ForeignKey(ContentType, models.CASCADE)
    object_id = models.PositiveIntegerField()
    action = models.CharField(choices=Feed.ACTIONS, max_length=30)
    data = JSONField(blank=True, default=None, null=True)
    created = models.DateTimeField()

    content_object = GenericForeignKey('content_type', 'object_id')

    def __str__(self):
        return str(self.id)

    class Meta:
        ordering = ('id',)
        verbose_name = 'Feed Element'
        verbose_name_plural = 'Feed Elements'
        unique_together = ('content_type', 'object_id', 'action')


class Reaction(OrderedModel):
    slug = CIAutoSlugField(populate_from='name', unique=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ('order',)
        verbose_name = 'Reaction'
        verbose_name_plural = 'Reactions'


class UserReaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, blank=True, default=None, null=True)
    feed = models.ForeignKey(Feed, models.CASCADE)
    reaction = models.ForeignKey(Reaction, models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return str(self.id)

    class Meta:
        ordering = ('-id',)
        verbose_name = 'User Reaction'
        verbose_name_plural = 'User Reactions'
        unique_together = ('user', 'feed', 'reaction')
