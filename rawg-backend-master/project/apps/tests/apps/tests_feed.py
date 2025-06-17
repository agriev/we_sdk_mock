from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.test import TransactionTestCase

from apps.common.cache import CommonContentType
from apps.feed.feed import followed_user
from apps.feed.models import Feed, FeedQueue, UserNotifyFeed
from apps.games.models import Collection, CollectionFeed, CollectionGame, Game
from apps.users.models import UserFollowElement, UserGame


class TasksTestCase(TransactionTestCase):
    def test_followed_user(self):
        user = get_user_model().objects.get_or_create(username='curt', email='curt@test.org')[0]
        follow = get_user_model().objects.get_or_create(username='nick', email='nick@test.org')[0]
        user_follow = UserFollowElement.objects.create(
            user=user, object_id=follow.id, content_type=CommonContentType().get(get_user_model())
        )
        queue = FeedQueue.objects.create(object_id=user_follow.id,
                                         content_type=ContentType.objects.get_for_model(user_follow),
                                         action=FeedQueue.ADDITION, data={})

        with transaction.atomic():
            followed_user(user.id, follow.id, queue)
        feed = Feed.objects.filter(action=Feed.ACTIONS_FOLLOW_USER, user=user).last()
        self.assertEquals(feed.data['users'], [follow.id])

        with transaction.atomic():
            followed_user(user.id, follow.id, queue)
        feed = Feed.objects.filter(action=Feed.ACTIONS_FOLLOW_USER, user=user).last()
        self.assertEquals(feed.data['users'], [follow.id])

    def test_delete_user(self):
        user = get_user_model().objects.get_or_create(username='kailey', email='kailey@test.org')[0].id
        user1 = get_user_model().objects.get_or_create(username='curt', email='curt@test.org')[0]
        user2 = get_user_model().objects.get_or_create(username='nick', email='nick@test.org')[0].id
        user3 = get_user_model().objects.get_or_create(username='warren', email='warren@test.org')[0].id

        queue = FeedQueue.objects.create(object_id=user1.id,
                                         content_type=ContentType.objects.get_for_model(user1),
                                         action=FeedQueue.ADDITION, data={})
        with transaction.atomic():
            feed1 = Feed.objects.create_followed_user(user, user1.id, queue).id
            feed2 = Feed.objects.create_followed_user(user, [user1.id, user2], queue).id
            feed3 = Feed.objects.create_followed_user(user, [user1.id, user2, user3], queue).id

        get_user_model().objects.get(pk=user1.id).delete()
        self.assertRaises(Feed.DoesNotExist, lambda: Feed.objects.get(id=feed1))
        self.assertEqual(Feed.objects.get(id=feed2).data['users'], [user2])
        self.assertEqual(Feed.objects.get(id=feed3).data['users'], [user2, user3])

        get_user_model().objects.get(pk=user3).delete()
        self.assertRaises(Feed.DoesNotExist, lambda: Feed.objects.get(id=feed1))
        self.assertEqual(Feed.objects.get(id=feed2).data['users'], [user2])
        self.assertEqual(Feed.objects.get(id=feed3).data['users'], [user2])

    def test_delete_game_simple(self):
        user = get_user_model().objects.get_or_create(username='kailey', email='kailey@test.org')[0].id
        game1 = Game.objects.get_or_create(name='Grand Theft Auto: San Andreas')[0]
        game2 = Game.objects.get_or_create(name='Grand Theft Auto: Vice City')[0].id
        game3 = Game.objects.get_or_create(name='Grand Theft Auto IV')[0].id

        status = UserGame.STATUS_PLAYING

        queue = FeedQueue.objects.create(object_id=game1.id,
                                         content_type=ContentType.objects.get_for_model(game1),
                                         action=FeedQueue.ADDITION, data={})
        with transaction.atomic():
            feed1 = Feed.objects.create_marked_game(user, game1.id, status, queue).id
            feed2 = Feed.objects.create_marked_game(user, [game1.id, game2], status, queue).id
            feed3 = Feed.objects.create_marked_game(user, [game1.id, game2, game3], status, queue).id

        Game.objects.get(pk=game1.id).delete()
        self.assertRaises(Feed.DoesNotExist, lambda: Feed.objects.get(id=feed1))
        self.assertEqual(Feed.objects.get(id=feed2).data['statuses'][status], [game2])
        self.assertEqual(Feed.objects.get(id=feed3).data['statuses'][status], [game2, game3])

        Game.objects.get(pk=game3).delete()
        self.assertRaises(Feed.DoesNotExist, lambda: Feed.objects.get(id=feed1))
        self.assertEqual(Feed.objects.get(id=feed2).data['statuses'][status], [game2])
        self.assertEqual(Feed.objects.get(id=feed3).data['statuses'][status], [game2])

    def test_delete_game_statuses(self):
        user = get_user_model().objects.get_or_create(username='kailey', email='kailey@test.org')[0].id
        game1 = Game.objects.get_or_create(name='Grand Theft Auto: San Andreas')[0]
        game2 = Game.objects.get_or_create(name='Grand Theft Auto: Vice City')[0].id
        game3 = Game.objects.get_or_create(name='Grand Theft Auto IV')[0].id

        status1 = UserGame.STATUS_TOPLAY
        status2 = UserGame.STATUS_BEATEN

        queue = FeedQueue.objects.create(object_id=game1.id,
                                         content_type=ContentType.objects.get_for_model(game1),
                                         action=FeedQueue.ADDITION, data={})
        with transaction.atomic():
            feed = Feed.objects.create_marked_game(user, game1.id, status1, queue)
            feed.add(game2, 'statuses', status2)
            feed.add(game3, 'statuses', status2)

        feed = Feed.objects.get(pk=feed.id)
        self.assertEqual(feed.data['statuses'][status1], [game1.id])
        self.assertIn(game2, feed.data['statuses'][status2])
        self.assertIn(game3, feed.data['statuses'][status2])

    def test_delete_collection(self):
        user = get_user_model().objects.get_or_create(username='kailey', email='kailey@test.org')[0].id
        collection1 = Collection.objects.get_or_create(name='My first collection', creator_id=user)[0]
        collection2 = Collection.objects.get_or_create(name='My second collection', creator_id=user)[0].id
        collection3 = Collection.objects.get_or_create(name='My third collection', creator_id=user)[0].id
        CollectionGame.objects.get_or_create(collection_id=collection1.id,
                                             game=Game.objects.create(name='Grand Theft Auto IV'))

        queue = FeedQueue.objects.get(object_id=collection1.id,
                                      content_type=ContentType.objects.get_for_model(collection1))
        with transaction.atomic():
            feed1 = Feed.objects.create_created_collection(user, collection1.id, queue).id
            feed2 = Feed.objects.create_created_collection(user, [collection1.id, collection2], queue).id
            feed3 = Feed.objects.create_created_collection(user, [collection1.id, collection2, collection3], queue).id

        Collection.objects.get(id=collection1.id).delete()
        self.assertRaises(Feed.DoesNotExist, lambda: Feed.objects.get(id=feed1))
        self.assertEqual(Feed.objects.get(id=feed2).data['collections'], [collection2])
        self.assertEqual(Feed.objects.get(id=feed3).data['collections'], [collection2, collection3])

        Collection.objects.get(id=collection3).delete()
        self.assertRaises(Feed.DoesNotExist, lambda: Feed.objects.get(id=feed1))
        self.assertEqual(Feed.objects.get(id=feed2).data['collections'], [collection2])
        self.assertEqual(Feed.objects.get(id=feed3).data['collections'], [collection2])

    def test_delete_collection_relative_personal(self):
        user = get_user_model().objects.get_or_create(username='nick', email='nick@test.org')[0].id
        creator = get_user_model().objects.get_or_create(username='kailey', email='kailey@test.org')[0].id
        creator_another = get_user_model().objects.get_or_create(username='warren', email='warren@test.org')[0].id
        collection1 = Collection.objects.get_or_create(name='My first collection', creator_id=creator)[0].id
        collection2 = Collection.objects.get_or_create(name='My second collection', creator_id=creator_another)[0].id

        UserFollowElement.objects.get_or_create(
            user_id=user, object_id=collection1, content_type=CommonContentType().get(Collection)
        )
        UserFollowElement.objects.get_or_create(
            user_id=user, object_id=collection2, content_type=CommonContentType().get(Collection)
        )

        personal = UserNotifyFeed.objects.get(user_id=creator, feed__data__collections__contains=collection1)
        self.assertEqual(personal.feed.data['collections'], [collection1, collection2])

        Collection.objects.get(id=collection1).delete()

        self.assertEqual([f.data['collections'] for f in Feed.objects.all()], [[collection2]])
        self.assertEqual(UserNotifyFeed.objects.get(id=personal.id).feed.data['collections'], [collection2])

    def test_delete_collection_feed(self):
        user = get_user_model().objects.create(username='kailey', email='kailey@test.org').id
        collection_1 = Collection.objects.create(name='My first collection')
        game_1 = Game.objects.create(name='Grand Theft Auto IV').id
        collection_game_1 = CollectionGame.objects.create(collection_id=collection_1.id, game_id=game_1).id
        collection_feed_1 = CollectionFeed.objects.order_by('-id').last().id

        queue = FeedQueue.objects.get(object_id=collection_1.id,
                                      content_type=ContentType.objects.get_for_model(collection_1))
        with transaction.atomic():
            feed1 = Feed.objects.create_added_feed_to_collection(user, collection_1.id, collection_feed_1,
                                                                 queue, game_1).id
        CollectionGame.objects.get(id=collection_game_1).delete()

        self.assertRaises(CollectionFeed.DoesNotExist, lambda: CollectionFeed.objects.get(id=collection_feed_1))
        self.assertRaises(Feed.DoesNotExist, lambda: Feed.objects.get(id=feed1))
