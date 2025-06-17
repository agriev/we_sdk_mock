import json
from datetime import timedelta
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.test import TransactionTestCase
from django.utils.timezone import now

from apps.comments.models import CommentDiscussion, CommentReview
from apps.common.cache import CommonContentType
from apps.discussions.models import Discussion
from apps.feed.models import Feed, FeedElement, FeedQueue, UserFeed, UserNotifyFeed
from apps.feed.tasks import game_is_released, most_rated_games, offer_change_playing, offer_rate_game, popular_games
from apps.games.models import (
    Collection, CollectionFeed, CollectionGame, CollectionOffer, Game, GamePlatform, Platform, PlatformParent,
)
from apps.reviews.models import Like, Review
from apps.tests.api.feed.tests_feed import FeedBaseTestCase
from apps.users.models import UserFollowElement, UserGame
from apps.utils.dates import monday


class FeedActionsTestCase(FeedBaseTestCase, TransactionTestCase):
    def test_followed_user_by_friend(self):
        url_action = '/api/users/current/following/users'

        # adding a user as a friend

        self.client_auth_4.post('/api/users/current/following/users', {'follow': self.user.id})

        # following

        self.client_auth.post(url_action, {'follow': self.user_1.id})

        action = self.client_auth_4.get(*self.explore_args).json()['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_FOLLOW_USER)

        action = self.client_auth_1.get(self.notifications).json()['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_FOLLOW_USER)
        self.assertEqual(action['users']['count'], 1)

        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 0)

        # following twice

        self.client_auth.post(url_action, {'follow': self.user_2.id})

        action = self.client_auth_4.get(*self.explore_args).json()['results'][0]
        usernames = [user['username'] for user in action['users']['results']]
        self.assertEqual(action['users']['count'], 2)
        self.assertIn(self.user_1.username, usernames)
        self.assertIn(self.user_2.username, usernames)

        action = self.client_auth_2.get(self.notifications).json()['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_FOLLOW_USER)
        self.assertEqual(action['users']['count'], 1)

        # check the counter for a followed user

        self.assertEqual(self.client_auth_1.get(self.counters).json()['notifications'], 1)

        # check a new event for a followed user

        action = self.client_auth_1.get(self.notifications).json()['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_FOLLOW_USER)
        self.assertEqual(action['users']['count'], 1)
        self.assertEqual(len(action['users']['results']), 1)
        self.assertIn('collections_count', action['users']['results'][0].keys())
        self.assertTrue(action['new'])

        # check the counter for a followed user is empty

        self.client_auth_1.post(self.counters, {'notifications': True})
        self.assertEqual(self.client_auth_1.get(self.counters).json()['notifications'], 0)

        # unfollowing and deleting from a group

        self.client_auth.delete('{}/{}'.format(url_action, self.user_2.id))
        self.assertEqual(self.client_auth_4.get(*self.explore_args).json()['results'][0]['users']['count'], 1)
        self.assertEqual(self.client_auth_2.get(self.notifications).json()['count'], 0)

        # following without grouping

        feed = Feed.objects.filter(action=Feed.ACTIONS_FOLLOW_USER).first()
        feed.created = now() - timedelta(minutes=Feed.GROUP_MINUTES * 2)
        feed.save()

        self.client_auth.post(url_action, {'follow': self.user_3.id})

        actions = self.client_auth_4.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 3)
        self.assertEqual(action['action'], Feed.ACTIONS_FOLLOW_USER)
        self.assertEqual(action['users']['count'], 1)
        self.assertEqual(action['users']['results'][0]['username'], self.user_3.username)

        # unfollowing and deleting a feed

        self.client_auth.delete('{}/{}'.format(url_action, self.user_3.id))
        self.assertEqual(self.client_auth_4.get(*self.explore_args).json()['count'], 2)
        self.assertEqual(self.client_auth_3.get(self.notifications).json()['count'], 0)

        # unfollowing without deleting a feed

        self.client_auth.delete('{}/{}'.format(url_action, self.user_1.id))
        self.assertEqual(self.client_auth_1.get(self.notifications).json()['count'], 1)
        # filling a user's feed

        self.assertEqual(self.client_auth_1.get(self.counters).json()['notifications'], 0)
        self.assertEqual(self.client_auth_1.get(self.notifications).json()['count'], 1)

        c_id = self.client_auth.post('/api/collections',
                                     {'name': 'my new collection', 'description': 'my new collection'}).json()['id']
        self.client_auth.post('/api/collections/{}/games'.format(c_id),
                              {'games': [self.game_1.id, self.game_2.id, self.game_3.id]})

        self.client_auth_1.post(url_action, {'follow': self.user.id})

        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 2)

        self.client_auth.post(url_action, {'follow': self.user_3.id})
        c_id = self.client_auth.post('/api/collections',
                                     {'name': 'my awesome collection', 'description': 'yeah'}).json()['id']
        self.client_auth.post('/api/collections/{}/games'.format(c_id),
                              {'games': [self.game_1.id, self.game_2.id, self.game_3.id]})

        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 3)

    def test_followed_user_mutual_1(self):
        url_action = '/api/users/current/following/users'

        self.client_auth.post(url_action, {'follow': self.user_1.id})
        self.client_auth_1.post(url_action, {'follow': self.user.id})

        self.assertEqual(self.client_auth.get(self.notifications).json()['count'], 1)
        self.assertEqual(self.client_auth_1.get(self.notifications).json()['count'], 1)

        self.client_auth_4.post('/api/users/current/following/users', {'follow': self.user.id})

    def test_followed_user_mutual_2(self):
        url_action = '/api/users/current/following/users'

        self.client_auth.post(url_action, {'follow': self.user_1.id})
        self.client_auth.post(url_action, {'follow': self.user_2.id})
        self.client_auth_1.post(url_action, {'follow': self.user.id})

        results = self.client_auth_1.get(self.notifications).json()
        self.assertEqual(results['count'], 1)
        self.assertEqual(results['results'][0]['users']['count'], 1)

        results = self.client_auth_2.get(self.notifications).json()
        self.assertEqual(results['count'], 1)
        self.assertEqual(results['results'][0]['users']['count'], 1)

        results = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(results['count'], 2)
        self.assertEqual(results['results'][0]['users']['count'], 1)
        self.assertEqual(results['results'][0]['users']['results'][0]['id'], self.user.id)
        self.assertEqual(results['results'][1]['users']['count'], 1)
        self.assertEqual(results['results'][1]['users']['results'][0]['id'], self.user_2.id)

    def test_followed_user_mutual_3(self):
        url_action = '/api/users/current/following/users'

        self.client_auth.post(url_action, {'follow': self.user_1.id})
        self.client_auth_1.post(url_action, {'follow': self.user.id})
        self.client_auth.post(url_action, {'follow': self.user_2.id})

        self.assertEqual(self.client_auth.get(self.notifications).json()['count'], 1)
        results = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(results['count'], 2)
        self.assertEqual(results['results'][0]['users']['count'], 1)
        self.assertEqual(results['results'][0]['users']['results'][0]['id'], self.user_2.id)
        self.assertEqual(results['results'][1]['users']['count'], 1)
        self.assertEqual(results['results'][1]['users']['results'][0]['id'], self.user.id)

    def test_followed_user_mutual_4(self):
        url_action = '/api/users/current/following/users'

        self.client_auth_1.post(url_action, {'follow': self.user.id})
        self.client_auth_1.post(url_action, {'follow': self.user_2.id})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['users']['results'][0]['id'], self.user.id)

        self.client_auth_4.post('/api/users/current/following/users', {'follow': self.user_1.id})
        actions = self.client_auth_4.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][1]['users']['count'], 2)
        ids = [u['id'] for u in actions['results'][1]['users']['results']]
        self.assertIn(self.user.id, ids)
        self.assertIn(self.user_2.id, ids)

    def test_followed_user_0(self):
        url_following = '/api/users/current/following/users'

        self.client_auth_1.post(url_following, {'follow': self.user.id})
        self.client_auth_1.post(url_following, {'follow': self.user_2.id})
        self.client_auth.post(url_following, {'follow': self.user_1.id})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)

        self.client_auth_1.delete('{}/{}'.format(url_following, self.user_2.id))

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)

    def test_followed_user_1(self):
        url_following = '/api/users/current/following/users'

        self.client_auth.post(url_following, {'follow': self.user_1.id})
        self.client_auth_1.post(url_following, {'follow': self.user.id})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_FOLLOW_USER)
        self.assertEqual(actions['results'][0]['users']['count'], 1)

    def test_followed_user_2(self):
        url_following = '/api/users/current/following/users'

        self.client_auth.post(url_following, {'follow': self.user_1.id})
        self.client_auth_1.post(url_following, {'follow': self.user_2.id})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 0)
        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_FOLLOW_USER)
        self.assertEqual(actions['results'][0]['users']['count'], 1)
        self.assertEqual(actions['results'][1]['action'], Feed.ACTIONS_FOLLOW_USER)
        self.assertEqual(actions['results'][1]['users']['count'], 1)

        self.client_auth_1.post(url_following, {'follow': self.user.id})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_FOLLOW_USER)
        self.assertEqual(actions['results'][0]['users']['count'], 1)
        self.assertEqual(actions['results'][0]['user']['id'], self.user_1.id)
        self.assertEqual(actions['results'][0]['users']['results'][0]['id'], self.user.id)

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_FOLLOW_USER)
        self.assertEqual(actions['results'][0]['users']['count'], 1)
        self.assertEqual(actions['results'][0]['user']['id'], self.user_1.id)
        self.assertEqual(actions['results'][0]['users']['results'][0]['id'], self.user_2.id)

    def test_followed_user_3(self):
        url_following = '/api/users/current/following/users'

        self.client_auth.post(url_following, {'follow': self.user_1.id})
        self.client_auth_1.post(url_following, {'follow': self.user.id})
        self.client_auth_1.post(url_following, {'follow': self.user_2.id})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)

        self.client_auth_1.delete('{}/{}'.format(url_following, self.user.id))

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 0)
        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)

    def test_marked_game_by_friend(self):
        url_action = '/api/users/current/games'

        # adding a user as a friend

        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user.id})

        # marking

        self.client_auth.post(url_action, {'game': self.game.id, 'status': UserGame.STATUS_BEATEN})

        action = self.client_auth_1.get(*self.explore_args).json()['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_MARK_GAME)
        self.assertEqual(action['status'], UserGame.STATUS_BEATEN)

        # marking twice

        self.client_auth.post(url_action, {'game': self.game_1.id, 'status': UserGame.STATUS_BEATEN})

        actions = self.client_auth_1.get(*self.explore_args).json()
        action = actions['results'][0]
        names = [game['name'] for status in action['statuses'].values() for game in status['results']]
        self.assertEqual(actions['count'], 2)
        self.assertEqual(action['games']['count'], 2)
        self.assertEqual(action['sources'], [UserFeed.SOURCES_USER])
        self.assertIn(self.game.name, names)
        self.assertIn(self.game_1.name, names)

        # marking three times

        self.client_auth.post(url_action, {'game': self.game_3.id, 'status': UserGame.STATUS_PLAYING})

        actions = self.client_auth_1.get(*self.explore_args).json()
        action = actions['results'][0]
        names = [game['name'] for status in action['statuses'].values() for game in status['results']]
        self.assertEqual(actions['count'], 3)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['status'], UserGame.STATUS_PLAYING)
        self.assertIn(self.game_3.name, names)
        self.assertNotIn(self.game.name, names)
        self.assertNotIn(self.game_1.name, names)

        # marking without feed

        game_1 = Game.objects.create(name='Bad game 1')
        game_2 = Game.objects.create(name='Bad game 2')
        game_3 = Game.objects.create(name='Bad game 3')
        self.client_auth.post(url_action, {'game': game_1.id, 'status': UserGame.STATUS_OWNED})
        self.client_auth.post(url_action, {'game': game_2.id, 'status': UserGame.STATUS_DROPPED})
        self.client_auth.post(url_action, {'game': game_3.id, 'status': UserGame.STATUS_YET})

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 3)

        # deleting a mark and deleting from a group

        self.client_auth.delete('{}/{}'.format(url_action, self.game_1.id))
        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 3)
        self.assertEqual(actions['results'][0]['games']['count'], 1)
        self.assertEqual(actions['results'][1]['games']['count'], 1)

        # marking without grouping

        feed = Feed.objects.filter(action=Feed.ACTIONS_MARK_GAME).first()
        feed.created = now() - timedelta(minutes=Feed.GROUP_MINUTES * 2)
        feed.save()

        self.client_auth.post(url_action, {'game': self.game_2.id, 'status': UserGame.STATUS_PLAYING})

        actions = self.client_auth_1.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 4)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['statuses'][UserGame.STATUS_PLAYING]['results'][0]['name'], self.game_2.name)

        # deleting a mark and deleting a feed

        self.client_auth.delete('{}/{}'.format(url_action, self.game_2.id))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 3)

        # deleting a mark without deleting a feed

        self.client_auth.delete('{}/{}'.format(url_action, self.game_3.id))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 3)

    def test_marked_game_by_friend_with_changing(self):
        url_action = '/api/users/current/games'

        # adding a user as a friend

        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user.id})

        # adding

        self.client_auth.post(url_action, {'game': self.game.id, 'status': UserGame.STATUS_PLAYING})
        self.client_auth.post(url_action, {'game': self.game_1.id, 'status': UserGame.STATUS_PLAYING})

        actions = self.client_auth_1.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 2)
        self.assertEqual(action['action'], Feed.ACTIONS_MARK_GAME)

        update = self.client_auth.patch(
            '{}/{}'.format(url_action, self.game.id), json.dumps({'status': UserGame.STATUS_BEATEN}),
            content_type='application/json'
        )
        self.assertEqual(update.status_code, 200)

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 3)
        self.assertEqual(actions['results'][0]['statuses'][UserGame.STATUS_BEATEN]['count'], 1)
        self.assertEqual(actions['results'][1]['statuses'][UserGame.STATUS_PLAYING]['count'], 1)

        self.client_auth.delete('{}/{}'.format(url_action, self.game.id))

        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 2)

    @patch.object(Feed, 'REVIEWS_DISCUSSIONS_COMMUNITY')
    def test_marked_game_fill_feed(self, feed_mock_community):
        feed_mock_community.return_value = {'comments': 3, 'likes': 3}
        url_action = '/api/users/current/games'

        # empty

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 0)

        # create a discussion

        Discussion.objects.create(title='One', game=self.game, user=self.user_1)

        # follow the game

        self.client_auth.post(url_action, {'game': self.game.id, 'status': UserGame.STATUS_BEATEN})

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_MARK_GAME)
        self.assertEqual(actions['results'][1]['action'], Feed.ACTIONS_ADD_DISCUSSION)
        self.assertIn(UserFeed.SOURCES_GAME, actions['results'][1]['sources'])

        # add events

        Discussion.objects.create(title='One', game=self.game, user=self.user_2)

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 3)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_DISCUSSION)
        self.assertIn(UserFeed.SOURCES_GAME, actions['results'][0]['sources'])
        self.assertEqual(actions['results'][1]['action'], Feed.ACTIONS_MARK_GAME)
        self.assertEqual(actions['results'][2]['action'], Feed.ACTIONS_ADD_DISCUSSION)
        self.assertIn(UserFeed.SOURCES_GAME, actions['results'][2]['sources'])

        # unfollow the game

        self.client_auth.delete('{}/{}'.format(url_action, self.game.id))

        actions = self.client_auth.get(*self.explore_args).json()
        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 0)

    def test_followed_collection(self):
        url_action = '/api/users/current/following/collections'

        # adding users as friends

        self.client_auth_4.post('/api/users/current/following/users', {'follow': self.user_2.id})
        self.client_auth_4.post('/api/users/current/following/users', {'follow': self.user_3.id})

        # following

        self.client_auth_2.post(url_action, {'collection': self.collection_3.id})

        action = self.client_auth.get(self.notifications).json()['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_FOLLOW_COLLECTION)

        actions = self.client_auth_4.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 2)
        self.assertEqual(action['action'], Feed.ACTIONS_FOLLOW_COLLECTION)

        # check the counter for a creator of a collection

        self.assertEqual(self.client_auth.get(self.counters).json()['notifications'], 1)

        # following twice

        self.client_auth_3.post(url_action, {'collection': self.collection_3.id})
        self.client_auth_3.post(url_action, {'collection': self.collection_4.id})

        actions = self.client_auth.get(self.notifications).json()
        action = actions['results'][0]
        names = [collection['name'] for collection in action['collections']['results']]
        self.assertEqual(actions['count'], 2)
        self.assertEqual(action['collections']['count'], 2)
        self.assertTrue(action['new'])
        self.assertIn(self.collection_3.name, names)
        self.assertIn(self.collection_4.name, names)

        actions = self.client_auth_4.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 3)
        self.assertEqual(action['collections']['count'], 2)
        self.assertEqual(action['action'], Feed.ACTIONS_FOLLOW_COLLECTION)

        # check the counter for a creator of a collection is empty

        self.client_auth.post(self.counters, {'notifications': True})
        self.assertEqual(self.client_auth.get(self.counters).json()['notifications'], 0)

        # unfollowing and deleting from a group

        self.client_auth_3.delete('{}/{}'.format(url_action, self.collection_3.id))
        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)
        self.assertTrue(action['new'])

        actions = self.client_auth_4.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 3)
        self.assertEqual(action['collections']['count'], 1)
        self.assertEqual(action['action'], Feed.ACTIONS_FOLLOW_COLLECTION)

        # following without grouping

        for feed in Feed.objects.filter(action=Feed.ACTIONS_FOLLOW_COLLECTION):
            feed.created = feed.created - timedelta(minutes=Feed.GROUP_MINUTES * 2)
            feed.save(update_fields=['created'])

        self.client_auth_3.post(url_action, {'collection': self.collection_3.id})

        actions = self.client_auth.get(self.notifications).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 3)
        self.assertEqual(action['collections']['count'], 1)
        self.assertEqual(action['collections']['results'][0]['name'], self.collection_3.name)

        actions = self.client_auth_4.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 4)
        self.assertEqual(action['collections']['count'], 1)
        self.assertEqual(action['action'], Feed.ACTIONS_FOLLOW_COLLECTION)

        # unfollowing and deleting a feed

        self.client_auth_3.delete('{}/{}'.format(url_action, self.collection_3.id))
        self.assertEqual(self.client_auth.get(self.notifications).json()['count'], 2)

        actions = self.client_auth_4.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 3)
        self.assertEqual(action['collections']['count'], 1)
        self.assertEqual(action['action'], Feed.ACTIONS_FOLLOW_COLLECTION)

        # unfollowing without deleting a feed

        self.client_auth_3.delete('{}/{}'.format(url_action, self.collection_4.id))
        self.assertEqual(self.client_auth.get(self.notifications).json()['count'], 2)

        actions = self.client_auth_4.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 3)
        self.assertEqual(action['collections']['count'], 1)
        self.assertEqual(action['action'], Feed.ACTIONS_FOLLOW_COLLECTION)

    def test_followed_collection_fill_feed(self):
        url_following = '/api/users/current/following/users'
        url_collection = '/api/users/current/following/collections'

        # empty

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 0)

        # create a collection

        collection = Collection.objects.create(name='The interesting collection', creator=self.user_3)
        CollectionGame.objects.create(collection=collection, game=self.game_1)
        CollectionGame.objects.create(collection=collection, game=self.game_2)
        CollectionGame.objects.create(collection=collection, game=self.game_3)

        # follow the collection

        self.client_auth.post(url_collection, {'collection': collection.id})

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_FOLLOW_COLLECTION)
        self.assertEqual(actions['results'][1]['action'], Feed.ACTIONS_CREATE_COLLECTION)
        self.assertEqual(actions['results'][1]['sources'], [UserFeed.SOURCES_COLLECTION])

        # add events

        Collection.objects.filter(id=collection.id).update(created=now() - timedelta(minutes=Feed.COLLECTION_TIME * 2))
        CollectionOffer.objects.create(
            collection=collection, game=Game.objects.create(name='New game'), creator=self.user_2
        )
        CollectionGame.objects.create(collection=collection, game=self.game)

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 4)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_GAME_TO_COLLECTION)
        self.assertEqual(actions['results'][0]['sources'], [UserFeed.SOURCES_COLLECTION])
        self.assertEqual(actions['results'][1]['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)
        self.assertEqual(actions['results'][1]['sources'], [UserFeed.SOURCES_COLLECTION])

        # follow the collection creator

        self.client_auth.post(url_following, {'follow': self.user_3.id})

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 5)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_FOLLOW_USER)
        self.assertEqual(actions['results'][0]['sources'], [UserFeed.SOURCES_USER])
        self.assertEqual(actions['results'][1]['action'], Feed.ACTIONS_ADD_GAME_TO_COLLECTION)
        self.assertIn(UserFeed.SOURCES_COLLECTION, actions['results'][1]['sources'])
        self.assertIn(UserFeed.SOURCES_USER, actions['results'][1]['sources'])
        self.assertEqual(actions['results'][2]['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)
        self.assertEqual(actions['results'][2]['sources'], [UserFeed.SOURCES_COLLECTION])
        self.assertEqual(actions['results'][3]['action'], Feed.ACTIONS_FOLLOW_COLLECTION)
        self.assertEqual(actions['results'][3]['sources'], [UserFeed.SOURCES_USER])
        self.assertEqual(actions['results'][4]['action'], Feed.ACTIONS_CREATE_COLLECTION)
        self.assertIn(UserFeed.SOURCES_COLLECTION, actions['results'][4]['sources'])
        self.assertIn(UserFeed.SOURCES_USER, actions['results'][4]['sources'])

        # unfollow the collection creator

        self.client_auth.delete('{}/{}'.format(url_following, self.user_3.id))

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 4)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_GAME_TO_COLLECTION)
        self.assertEqual(actions['results'][0]['sources'], [UserFeed.SOURCES_COLLECTION])
        self.assertEqual(actions['results'][1]['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)
        self.assertEqual(actions['results'][1]['sources'], [UserFeed.SOURCES_COLLECTION])
        self.assertEqual(actions['results'][2]['action'], Feed.ACTIONS_FOLLOW_COLLECTION)
        self.assertEqual(actions['results'][2]['sources'], [UserFeed.SOURCES_USER])
        self.assertEqual(actions['results'][3]['action'], Feed.ACTIONS_CREATE_COLLECTION)
        self.assertEqual(actions['results'][3]['sources'], [UserFeed.SOURCES_COLLECTION])

        # unfollow the collection

        self.client_auth.delete('{}/{}'.format(url_collection, collection.id))

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 0)

    def test_followed_collection_0(self):
        url_following = '/api/users/current/following/users'
        url_collection = '/api/users/current/following/collections'

        self.client_auth_1.post(url_following, {'follow': self.user.id})
        self.client_auth_1.post(url_following, {'follow': self.user_2.id})
        self.client_auth_1.post(url_collection, {'collection': self.collection_3.id})
        self.client_auth_1.post(url_collection, {'collection': self.collection_1.id})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)
        self.assertEqual(actions['results'][0]['collections']['results'][0]['id'], self.collection_3.id)

        self.client_auth.post(url_following, {'follow': self.user_1.id})

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 3)
        self.assertEqual(actions['results'][1]['collections']['count'], 1)

        self.client_auth.delete('{}/{}'.format(url_following, self.user_1.id))

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 0)

    def test_followed_collection_1(self):
        url_following = '/api/users/current/following/users'
        url_collection = '/api/users/current/following/collections'

        self.client_auth_1.post(url_following, {'follow': self.user.id})
        self.client_auth.post(url_following, {'follow': self.user_1.id})

        self.client_auth_1.post(url_collection, {'collection': self.collection_3.id})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_FOLLOW_COLLECTION)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)

    def test_followed_collection_2(self):
        url_following = '/api/users/current/following/users'
        url_collection = '/api/users/current/following/collections'

        self.client_auth.post(url_following, {'follow': self.user_1.id})
        self.client_auth_1.post(url_collection, {'collection': self.collection_1.id})

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_FOLLOW_COLLECTION)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)

        self.client_auth_1.post(url_collection, {'collection': self.collection_3.id})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_FOLLOW_COLLECTION)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)

    def test_followed_collection_3(self):
        url_following = '/api/users/current/following/users'
        url_collection = '/api/users/current/following/collections'

        self.client_auth.post(url_following, {'follow': self.user_1.id})
        self.client_auth_1.post(url_collection, {'collection': self.collection_1.id})
        self.client_auth_1.post(url_collection, {'collection': self.collection_3.id})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_FOLLOW_COLLECTION)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)

        self.client_auth_1.delete('{}/{}'.format(url_collection, self.collection_1.id))
        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_FOLLOW_COLLECTION)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)

    def test_followed_collection_4(self):
        url_following = '/api/users/current/following/users'
        url_collection = '/api/users/current/following/collections'

        self.client_auth.post(url_following, {'follow': self.user_1.id})
        self.client_auth_1.post(url_collection, {'collection': self.collection_3.id})
        self.client_auth_1.post(url_collection, {'collection': self.collection_1.id})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_FOLLOW_COLLECTION)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)

        self.client_auth_1.delete('{}/{}'.format(url_collection, self.collection_3.id))
        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 0)

    def test_created_collection_by_friend(self):
        url_action = '/api/collections'
        url_action_games = '/api/collections/{}/games'

        # creating a collection

        name = 'my new collection'
        collection = self.client_auth.post(url_action, {'name': name, 'description': name}).json()

        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 0)

        # adding games in a collection

        self.client_auth.post(url_action_games.format(collection['id']),
                              {'games': [self.game.id, self.game_1.id, self.game_2.id]})

        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 0)

        # adding a user as a friend

        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user.id})

        action = self.client_auth_1.get(*self.explore_args).json()['results'][1]
        self.assertEqual(action['action'], Feed.ACTIONS_CREATE_COLLECTION)
        self.assertEqual(Feed.objects.get(id=action['id']).language, settings.DEFAULT_LANGUAGE)

        # creating a collection twice

        name = 'my another new collection'
        collection_1 = self.client_auth.post(url_action, {'name': name, 'description': name}).json()
        self.client_auth.post(url_action_games.format(collection_1['id']),
                              {'games': [self.game.id, self.game_1.id, self.game_2.id]})

        action = self.client_auth_1.get(*self.explore_args).json()['results'][0]
        names = [collection['name'] for collection in action['collections']['results']]
        self.assertEqual(action['collections']['count'], 2)
        self.assertIn(collection['name'], names)
        self.assertIn(collection_1['name'], names)

        # deleting a collection and deleting from a group

        self.client_auth.delete('{}/{}'.format(url_action, collection_1['id']))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['results'][0]['collections']['count'], 1)

        # creating a collection without grouping

        feed = Feed.objects.filter(action=Feed.ACTIONS_CREATE_COLLECTION).last()
        feed.created = now() - timedelta(minutes=Feed.GROUP_MINUTES * 2)
        feed.save()

        name = 'my amazing new collection'
        collection_2 = self.client_auth.post(url_action, {'name': name, 'description': name}).json()
        self.client_auth.post(url_action_games.format(collection_2['id']),
                              {'games': [self.game.id, self.game_1.id, self.game_2.id]})

        actions = self.client_auth_1.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 3)
        self.assertEqual(action['collections']['count'], 1)
        self.assertEqual(action['collections']['results'][0]['name'], collection_2['name'])

        # deleting a game from a collection and deleting a feed

        self.client_auth.delete('{}/{}'.format(url_action_games.format(collection_2['id']), self.game_2.id))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 2)

        # deleting a collection and deleting an old feed

        self.client_auth.delete('{}/{}'.format(url_action, collection['id']))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 1)

    def test_added_game_to_collection_by_friend(self):
        collection_3 = Collection.objects.create(name='My fourth collection!', creator=self.user)
        collection_4 = Collection.objects.create(name='My fifth collection!', creator=self.user)
        collection_3.created = now() - timedelta(minutes=Feed.COLLECTION_TIME + 1)
        collection_4.created = now() - timedelta(minutes=Feed.COLLECTION_TIME + 1)
        collection_3.save()
        collection_4.save()

        url_action = '/api/collections/{}/games'.format(collection_3.id)
        url_action_another = '/api/collections/{}/games'.format(collection_4.id)

        # adding

        self.client_auth.post(url_action, {'games': [self.game.id]})

        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 0)

        # adding a user as a friend

        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user.id})

        action = self.client_auth_1.get(*self.explore_args).json()['results'][1]
        self.assertEqual(action['action'], Feed.ACTIONS_ADD_GAME_TO_COLLECTION)

        # adding twice

        self.client_auth.post(url_action, {'games': [self.game_1.id]})

        action = self.client_auth_1.get(*self.explore_args).json()['results'][0]
        names = [game['name'] for game in action['games']['results']]
        self.assertEqual(action['games']['count'], 2)
        self.assertIn(self.game.name, names)
        self.assertIn(self.game_1.name, names)

        # deleting a game and deleting from a group

        self.client_auth.delete('{}/{}'.format(url_action, self.game_1.id))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['results'][0]['games']['count'], 1)

        # adding without grouping

        feed = Feed.objects.filter(action=Feed.ACTIONS_ADD_GAME_TO_COLLECTION).last()
        feed.created = now() - timedelta(minutes=Feed.GROUP_MINUTES * 2)
        feed.save()

        self.client_auth.post(url_action, {'games': [self.game_2.id]})

        actions = self.client_auth_1.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 3)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['games']['results'][0]['name'], self.game_2.name)

        # deleting a game and deleting a feed

        self.client_auth.delete('{}/{}'.format(url_action, self.game_2.id))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 2)

        # deleting a game without deleting a feed

        self.client_auth.delete('{}/{}'.format(url_action, self.game.id))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 2)

        # adding twice in two different collections

        self.client_auth.post(url_action, {'games': [self.game_3.id, self.game_2.id]})
        self.client_auth.post(url_action_another, {'games': [self.game.id, self.game_1.id, self.game_2.id]})

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 5)
        self.assertEqual(actions['results'][0]['games']['count'], 3)
        self.assertEqual(actions['results'][1]['games']['count'], 2)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)
        self.assertEqual(actions['results'][1]['collections']['count'], 1)

    def test_added_game_to_collection_feed_by_friend(self):
        collection = Collection.objects.create(name='My fourth collection!', creator=self.user)
        collection.created = now() - timedelta(minutes=Feed.COLLECTION_TIME + 1)
        collection.save()

        url_action = '/api/collections/{}/games'.format(collection.id)
        url_action_feed = '/api/collections/{}/feed'.format(collection.id)

        self.client_auth.post(url_action, {'games': [self.game.id, self.game_1.id, self.game_2.id]})
        records = self.client.get(url_action_feed).json()['results']

        # adding a user as a friend

        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user.id})

        # adding a comment

        self.client_auth.patch('{}/{}'.format(url_action_feed, records[0]['id']),
                               json.dumps({'text': 'my comment!'}), content_type='application/json')

        actions = self.client_auth_1.get(*self.explore_args).json()
        action = actions['results'][1]
        self.assertEqual(actions['count'], 4)
        self.assertEqual(action['action'], Feed.ACTIONS_ADD_FEED_TO_COLLECTION)
        self.assertEqual(action['collection_feeds']['results'][0]['text'], 'my comment!')
        self.assertEqual(action['games']['count'], 1)
        action_games = actions['results'][2]
        self.assertEqual(action_games['games']['count'], 2)
        self.assertEqual(Feed.objects.get(id=action['id']).language, settings.DEFAULT_LANGUAGE)

        # adding a comment twice

        self.client_auth.patch('{}/{}'.format(url_action_feed, records[1]['id']),
                               json.dumps({'text': 'my comment 2!'}), content_type='application/json')

        actions = self.client_auth_1.get(*self.explore_args).json()
        action = actions['results'][2]
        self.assertEqual(actions['count'], 5)
        self.assertEqual(action['collection_feeds']['results'][0]['text'], 'my comment 2!')
        self.assertEqual(action['games']['count'], 1)
        action_games = actions['results'][2]
        self.assertEqual(action_games['games']['count'], 1)

        # deleting a comment

        self.client_auth.patch('{}/{}'.format(url_action_feed, records[1]['id']),
                               json.dumps({'text': ''}), content_type='application/json')

        actions = self.client_auth_1.get(*self.explore_args).json()
        action = actions['results'][1]
        self.assertEqual(actions['count'], 4)
        self.assertEqual(action['collection_feeds']['results'][0]['text'], 'my comment!')
        self.assertEqual(action['games']['count'], 1)
        action_games = actions['results'][1]
        self.assertEqual(action_games['games']['count'], 1)

        # adding a review

        ratings = self.client.get('/api/reviews/ratings').json()['results']
        review_id = self.client_auth.post('/api/reviews', {
            'game': self.game.id,
            'rating': ratings[1]['id'],
            'text': 'awesome!\nplay right now!',
        }).json()['id']
        post = self.client_auth.post(url_action_feed, {'text': 'my review comment!', 'review': review_id})
        self.assertEqual(post.status_code, 201)

        actions = self.client_auth_1.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 6)
        self.assertEqual(action['collection_feeds']['results'][0]['text'], 'my review comment!')
        self.assertEqual(action['reviews']['results'][0]['id'], review_id)
        self.assertEqual(action['games']['results'][0]['id'], self.game.id)

        # adding a discussion

        discussion_id = self.client_auth.post('/api/discussions', {
            'game': self.game.id,
            'title': 'awesome?',
            'text': 'awesome!\nplay right now!',
        }).json()['id']
        post = self.client_auth.post(url_action_feed, {'text': 'my discussion comment!', 'discussion': discussion_id})
        self.assertEqual(post.status_code, 201)

        actions = self.client_auth_1.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 8)
        self.assertEqual(action['collection_feeds']['results'][0]['text'], 'my discussion comment!')
        self.assertEqual(action['discussions']['results'][0]['id'], discussion_id)
        self.assertEqual(action['games']['results'][0]['id'], self.game.id)

        # adding a comment of a review

        comment_id = self.client_auth.post('/api/reviews/{}/comments'.format(review_id),
                                           {'text': 'cool!'}).json()['id']
        post = self.client_auth.post(url_action_feed,
                                     {'text': 'my review!', 'review': review_id, 'comment': comment_id})
        self.assertEqual(post.status_code, 201)

        actions = self.client_auth_1.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 9)
        self.assertEqual(action['collection_feeds']['results'][0]['text'], 'my review!')
        self.assertEqual(action['comments']['results'][0]['id'], comment_id)
        self.assertEqual(action['reviews']['results'][0]['id'], review_id)
        self.assertEqual(action['games']['results'][0]['id'], self.game.id)

        # adding a comment of a discussion

        comment_id = self.client_auth.post('/api/discussions/{}/comments'.format(discussion_id),
                                           {'text': 'cool!'}).json()['id']
        post = self.client_auth.post(url_action_feed,
                                     {'text': 'my discussion!', 'discussion': discussion_id, 'comment': comment_id})
        feed_id = post.json()['id']
        self.assertEqual(post.status_code, 201)

        actions = self.client_auth_1.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 10)
        self.assertEqual(action['collection_feeds']['results'][0]['text'], 'my discussion!')
        self.assertEqual(action['comments']['results'][0]['id'], comment_id)
        self.assertEqual(action['discussions']['results'][0]['id'], discussion_id)
        self.assertEqual(action['games']['results'][0]['id'], self.game.id)

        # delete something

        delete = self.client_auth.delete('{}/{}'.format(url_action_feed, feed_id))
        self.assertEqual(delete.status_code, 204)

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 9)

    def test_suggested_game_to_collection(self):
        url_action = '/api/collections/{}/offers'.format(self.collection.id)
        url_action_another = '/api/collections/{}/offers'.format(self.collection_1.id)

        # adding a user as a friend

        self.client_auth_4.post('/api/users/current/following/users', {'follow': self.user.id})

        # offering

        self.client_auth.post(url_action, {'games': [self.game.id]})

        action = self.client_auth_3.get(self.notifications).json()['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)

        actions = self.client_auth_4.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 2)
        self.assertEqual(action['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)

        # offering twice

        self.client_auth.post(url_action, {'games': [self.game_1.id]})

        action = self.client_auth_3.get(self.notifications).json()['results'][0]
        names = [game['name'] for game in action['games']['results']]
        self.assertEqual(action['games']['count'], 2)
        self.assertIn(self.game.name, names)
        self.assertIn(self.game_1.name, names)

        actions = self.client_auth_4.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 2)
        self.assertEqual(action['games']['count'], 2)
        self.assertEqual(action['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)

        # deleting an offer and deleting from a group

        self.client_auth.delete('{}/{}'.format(url_action, self.game_1.id))
        self.assertEqual(self.client_auth_3.get(self.notifications).json()['results'][0]['games']['count'], 1)

        actions = self.client_auth_4.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 2)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)

        # offering without grouping

        for feed in Feed.objects.filter(action=Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION):
            feed.created = now() - timedelta(minutes=Feed.GROUP_MINUTES * 2)
            feed.save()

        self.client_auth.post(url_action, {'games': [self.game_2.id]})

        actions = self.client_auth_3.get(self.notifications).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 2)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['games']['results'][0]['name'], self.game_2.name)

        actions = self.client_auth_4.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 3)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)

        # deleting an offer and deleting a feed

        self.client_auth.delete('{}/{}'.format(url_action, self.game_2.id))
        self.assertEqual(self.client_auth_3.get(self.notifications).json()['count'], 1)

        actions = self.client_auth_4.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 2)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)

        # deleting an offer without deleting a feed

        self.client_auth.delete('{}/{}'.format(url_action, self.game.id))
        self.assertEqual(self.client_auth_3.get(self.notifications).json()['count'], 1)

        actions = self.client_auth_4.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(actions['count'], 2)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)

        # offering twice in two different collections

        self.client_auth.post(url_action, {'games': [self.game_3.id, self.game_2.id]})
        self.client_auth.post(url_action_another, {'games': [self.game.id, self.game_1.id, self.game_2.id]})

        actions = self.client_auth_3.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['games']['count'], 2)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)

        actions = self.client_auth_2.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['games']['count'], 3)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)

        actions = self.client_auth_4.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 4)
        self.assertEqual(actions['results'][0]['games']['count'], 3)
        self.assertEqual(actions['results'][1]['games']['count'], 2)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)
        self.assertEqual(actions['results'][1]['collections']['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)
        self.assertEqual(actions['results'][1]['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)

        # check the counter for a creator of a collection

        self.assertEqual(self.client_auth_3.get(self.counters).json()['notifications'], 2)

        # check the counter for a creator of a collection is empty

        self.client_auth_3.post(self.counters, {'notifications': True})
        self.assertEqual(self.client_auth_3.get(self.counters).json()['notifications'], 0)

    def test_suggested_game_to_collection_0(self):
        url_following = '/api/users/current/following/users'
        url_suggesting = '/api/collections/{}/offers'.format(self.collection_3.id)
        url_suggesting_2 = '/api/collections/{}/offers'.format(self.collection_1.id)

        self.client_auth_1.post(url_following, {'follow': self.user.id})
        self.client_auth_1.post(url_following, {'follow': self.user_2.id})
        self.client_auth_1.post(url_suggesting, {'games': [self.game.id]})
        self.client_auth_1.post(url_suggesting_2, {'games': [self.game_1.id]})

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 0)

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['collections']['results'][0]['id'], self.collection_3.id)

        self.client_auth.post(url_following, {'follow': self.user_1.id})

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 3)

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)

    def test_suggested_game_to_collection_1(self):
        url_following = '/api/users/current/following/users'
        url_suggesting = '/api/collections/{}/offers'.format(self.collection_3.id)
        url_suggesting_another = '/api/collections/{}/offers'.format(self.collection_2.id)

        self.client_auth_1.post(url_following, {'follow': self.user.id})
        self.client_auth_1.post(url_suggesting, {'games': [self.game.id]})
        self.client_auth_1.post(url_suggesting_another, {'games': [self.game.id]})

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 0)

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)
        self.assertEqual(actions['results'][0]['collections']['results'][0]['id'], self.collection_3.id)

        self.client_auth.post(url_following, {'follow': self.user_1.id})

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][1]['collections']['count'], 1)
        self.assertEqual(actions['results'][1]['collections']['results'][0]['id'], self.collection_2.id)

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['collections']['count'], 1)
        self.assertEqual(actions['results'][0]['collections']['results'][0]['id'], self.collection_3.id)

    def test_suggested_game_to_collection_2(self):
        url_following = '/api/users/current/following/users'
        url_suggesting = '/api/collections/{}/offers'.format(self.collection_3.id)
        url_suggesting_2 = '/api/collections/{}/offers'.format(self.collection_1.id)

        self.client_auth.post(url_following, {'follow': self.user_1.id})
        self.client_auth_1.post(url_suggesting_2, {'games': [self.game_1.id]})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 0)

        self.client_auth_1.post(url_suggesting, {'games': [self.game.id]})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)

    def test_suggested_game_to_collection_3(self):
        url_suggesting = '/api/collections/{}/offers'.format(self.collection_3.id)
        url_games = '/api/collections/{}/games'.format(self.collection_3.id)

        self.client_auth_1.post(url_suggesting, {'games': [self.game.id]})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['user']['id'], self.user_1.id)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 0)

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['user']['id'], self.user_1.id)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)

        self.client_auth.post(url_games, {'games': [self.game.id, self.game_1.id, self.game_2.id]})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['user']['id'], self.user_1.id)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['user']['id'], self.user.id)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_CREATE_COLLECTION)

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['user']['id'], self.user_1.id)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION)

    def test_added_review_by_friend(self):
        url_action = '/api/reviews'
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']

        # adding a user as a friend

        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user.id})

        # adding

        id1 = self.client_auth.post(url_action, {
            'game': self.game.id,
            'rating': ratings[1]['id'],
            'reactions': [reactions[0]['id'], reactions[3]['id']],
            'text': 'awesome!\nplay right now!',
        }).json()['id']
        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_REVIEW)
        self.assertEqual(actions['results'][0]['reviews']['results'][0]['id'], id1)
        self.assertIn(UserFeed.SOURCES_USER, actions['results'][0]['sources'])
        self.assertEqual(Feed.objects.get(id=actions['results'][0]['id']).language, settings.DEFAULT_LANGUAGE)

        # adding twice

        id2 = self.client_auth.post(url_action, {
            'game': self.game_1.id,
            'rating': ratings[1]['id'],
            'reactions': [reactions[0]['id'], reactions[3]['id']],
            'text': 'cool',
        }).json()['id']
        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 3)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_REVIEW)
        self.assertEqual(actions['results'][0]['reviews']['results'][0]['id'], id2)
        self.assertIn(UserFeed.SOURCES_USER, actions['results'][0]['sources'])
        self.assertEqual(actions['results'][1]['action'], Feed.ACTIONS_ADD_REVIEW)
        self.assertEqual(actions['results'][1]['reviews']['results'][0]['id'], id1)
        self.assertIn(UserFeed.SOURCES_USER, actions['results'][1]['sources'])

        # deleting a review and deleting a feed

        self.client_auth.delete('{}/{}'.format(url_action, id1))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 2)

        # deleting an old review and deleting a feed

        feed = Feed.objects.filter(action=Feed.ACTIONS_ADD_REVIEW).last()
        feed.created = now() - timedelta(minutes=Feed.GROUP_MINUTES * 2)
        feed.save()

        self.client_auth.delete('{}/{}'.format(url_action, id2))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 1)

    def test_added_review_by_community(self):
        url_action = '/api/reviews'
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']

        # adding

        id1 = self.client_auth.post(url_action, {
            'game': self.game.id,
            'rating': ratings[1]['id'],
            'reactions': [reactions[0]['id'], reactions[3]['id']],
            'text': 'awesome!\nplay right now!',
        }).json()['id']
        for i in range(0, Feed.REVIEWS_DISCUSSIONS_COMMUNITY['likes']):
            Like.objects.create(
                review_id=id1,
                user=get_user_model().objects.create(username='user{}'.format(i), email='user{}@test.io'.format(i))
            )

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_REVIEW)
        self.assertEqual(actions['results'][0]['reviews']['results'][0]['id'], id1)
        self.assertEqual(actions['results'][0]['sources'], [UserFeed.SOURCES_COMMON])
        self.assertEqual(Feed.objects.get(id=actions['results'][0]['id']).language, settings.DEFAULT_LANGUAGE)

        # adding twice

        id2 = self.client_auth.post(url_action, {
            'game': self.game_1.id,
            'rating': ratings[1]['id'],
            'reactions': [reactions[0]['id'], reactions[3]['id']],
            'text': 'cool',
        }).json()['id']
        for i in range(0, Feed.REVIEWS_DISCUSSIONS_COMMUNITY['comments']):
            user = get_user_model().objects.get_or_create(
                username='user{}'.format(i), email='user{}@test.io'.format(i)
            )[0]
            CommentReview.objects.create(object_id=id2, user=user, text='comment {}'.format(i))

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_REVIEW)
        self.assertEqual(actions['results'][0]['reviews']['results'][0]['id'], id2)
        self.assertEqual(actions['results'][0]['sources'], [UserFeed.SOURCES_COMMON])
        self.assertEqual(actions['results'][1]['action'], Feed.ACTIONS_ADD_REVIEW)
        self.assertEqual(actions['results'][1]['reviews']['results'][0]['id'], id1)
        self.assertEqual(actions['results'][1]['sources'], [UserFeed.SOURCES_COMMON])

        # deleting a review and deleting a feed

        self.client_auth.delete('{}/{}'.format(url_action, id1))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 1)

        # deleting an old review and deleting a feed

        feed = Feed.objects.filter(action=Feed.ACTIONS_ADD_REVIEW).last()
        feed.created = now() - timedelta(minutes=Feed.GROUP_MINUTES * 2)
        feed.save()

        self.client_auth.delete('{}/{}'.format(url_action, id2))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 0)

    def test_empty_user_added_review_by_community(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']

        # adding

        id1 = Review.objects.create(text='Good!', rating=ratings[1]['id'], game_id=self.game_1.id, )
        for i in range(0, Feed.REVIEWS_DISCUSSIONS_COMMUNITY['likes']):
            Like.objects.create(
                review_id=id1,
                user=get_user_model().objects.create(username='user{}'.format(i), email='user{}@test.io'.format(i))
            )

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 0)

        feed = Feed.objects.filter(action=Feed.ACTIONS_ADD_REVIEW)
        self.assertEqual(len(feed), 0)

    def test_added_review_by_changing(self):
        url_action = '/api/reviews'
        ratings = self.client.get('/api/reviews/ratings').json()['results']

        # adding a user as a friend

        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user.id})

        # adding without text

        id1 = self.client_auth.post(url_action, {
            'game': self.game.id,
            'rating': ratings[1]['id'],
        }).json()['id']

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        self.assertNotEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_REVIEW)

        # adding text

        self.client_auth.patch(
            '{}/{}'.format(url_action, id1), json.dumps({'text': 'awesome!\nplay right now!'}),
            content_type='application/json'
        )

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_REVIEW)
        self.assertEqual(actions['results'][0]['reviews']['results'][0]['id'], id1)

    def test_added_discussion_by_friend(self):
        url_action = '/api/discussions'

        # adding a user as a friend

        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user.id})

        # adding

        id1 = self.client_auth.post(url_action, {
            'game': self.game.id,
            'title': 'awesome?',
            'text': 'awesome!\nplay right now!',
        }).json()['id']
        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_DISCUSSION)
        self.assertEqual(actions['results'][0]['discussions']['results'][0]['id'], id1)
        self.assertIn(UserFeed.SOURCES_USER, actions['results'][0]['sources'])
        self.assertEqual(Feed.objects.get(id=actions['results'][0]['id']).language, settings.DEFAULT_LANGUAGE)

        # adding twice

        id2 = self.client_auth.post(url_action, {
            'game': self.game_1.id,
            'title': 'cool?',
            'text': 'cool',
        }).json()['id']
        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 3)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_DISCUSSION)
        self.assertEqual(actions['results'][0]['discussions']['results'][0]['id'], id2)
        self.assertIn(UserFeed.SOURCES_USER, actions['results'][0]['sources'])
        self.assertEqual(actions['results'][1]['action'], Feed.ACTIONS_ADD_DISCUSSION)
        self.assertEqual(actions['results'][1]['discussions']['results'][0]['id'], id1)
        self.assertIn(UserFeed.SOURCES_USER, actions['results'][1]['sources'])

        # deleting a discussion and deleting a feed

        self.client_auth.delete('{}/{}'.format(url_action, id1))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 2)

        # deleting an old discussion and deleting a feed

        feed = Feed.objects.filter(action=Feed.ACTIONS_ADD_DISCUSSION).last()
        feed.created = now() - timedelta(minutes=Feed.GROUP_MINUTES * 2)
        feed.save()

        self.client_auth.delete('{}/{}'.format(url_action, id2))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 1)

    def test_added_discussion_by_community(self):
        url_action = '/api/discussions'

        # adding

        id1 = self.client_auth.post(url_action, {
            'game': self.game.id,
            'title': 'awesome?',
            'text': 'awesome!\nplay right now!',
        }).json()['id']
        for i in range(0, Feed.REVIEWS_DISCUSSIONS_COMMUNITY['comments']):
            user = get_user_model().objects.create(username='user{}'.format(i), email='user{}@test.io'.format(i))
            CommentDiscussion.objects.create(object_id=id1, user=user, text='comment {}'.format(i))

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_DISCUSSION)
        self.assertEqual(actions['results'][0]['discussions']['results'][0]['id'], id1)
        self.assertEqual(actions['results'][0]['sources'], [UserFeed.SOURCES_COMMON])
        self.assertEqual(Feed.objects.get(id=actions['results'][0]['id']).language, settings.DEFAULT_LANGUAGE)

        # adding twice

        id2 = self.client_auth.post(url_action, {
            'game': self.game_1.id,
            'title': 'cool?',
            'text': 'cool',
        }).json()['id']
        for i in range(0, Feed.REVIEWS_DISCUSSIONS_COMMUNITY['comments']):
            user = get_user_model().objects.get_or_create(
                username='user{}'.format(i), email='user{}@test.io'.format(i)
            )[0]
            CommentDiscussion.objects.create(object_id=id2, user=user, text='comment {}'.format(i))

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_DISCUSSION)
        self.assertEqual(actions['results'][0]['discussions']['results'][0]['id'], id2)
        self.assertEqual(actions['results'][0]['sources'], [UserFeed.SOURCES_COMMON])
        self.assertEqual(actions['results'][1]['action'], Feed.ACTIONS_ADD_DISCUSSION)
        self.assertEqual(actions['results'][1]['discussions']['results'][0]['id'], id1)
        self.assertEqual(actions['results'][1]['sources'], [UserFeed.SOURCES_COMMON])

        # deleting a discussion and deleting a feed

        self.client_auth.delete('{}/{}'.format(url_action, id1))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 1)

        # deleting an old discussion and deleting a feed

        feed = Feed.objects.filter(action=Feed.ACTIONS_ADD_DISCUSSION).last()
        feed.created = now() - timedelta(minutes=Feed.GROUP_MINUTES * 2)
        feed.save()

        self.client_auth.delete('{}/{}'.format(url_action, id2))
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 0)

    @patch.object(Feed, 'REVIEWS_DISCUSSIONS_COMMUNITY')
    def test_added_discussion_by_game(self, feed_mock_community):
        feed_mock_community.return_value = {'comments': 3, 'likes': 3}
        url_action = '/api/discussions'

        # following

        UserGame.objects.create(user=self.user, game=self.game)
        UserGame.objects.create(user=self.user, game=self.game_1)
        UserFollowElement.objects.create(
            user=self.user, object_id=self.user_1.id, content_type=CommonContentType().get(get_user_model())
        )
        id1 = self.client_auth_1.post(url_action, {
            'game': self.game.id,
            'title': 'cool?',
            'text': 'cool',
        }).json()['id']
        id2 = self.client_auth_2.post(url_action, {
            'game': self.game_1.id,
            'title': 'cool?',
            'text': 'cool',
        }).json()['id']

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 3)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_DISCUSSION)
        self.assertEqual(actions['results'][0]['discussions']['results'][0]['id'], id2)
        self.assertIn(UserFeed.SOURCES_GAME, actions['results'][0]['sources'])
        self.assertEqual(actions['results'][1]['action'], Feed.ACTIONS_ADD_DISCUSSION)
        self.assertEqual(actions['results'][1]['discussions']['results'][0]['id'], id1)
        self.assertIn(UserFeed.SOURCES_GAME, actions['results'][1]['sources'])
        self.assertIn(UserFeed.SOURCES_USER, actions['results'][1]['sources'])

        # unfollowing 1

        UserGame.objects.filter(user=self.user, game=self.game_1).delete()

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_DISCUSSION)
        self.assertEqual(actions['results'][0]['discussions']['results'][0]['id'], id1)
        self.assertIn(UserFeed.SOURCES_GAME, actions['results'][0]['sources'])
        self.assertIn(UserFeed.SOURCES_USER, actions['results'][0]['sources'])

        # unfollowing 2

        UserGame.objects.filter(user=self.user, game=self.game).delete()

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_DISCUSSION)
        self.assertEqual(actions['results'][0]['discussions']['results'][0]['id'], id1)
        self.assertNotIn(UserFeed.SOURCES_GAME, actions['results'][0]['sources'])
        self.assertIn(UserFeed.SOURCES_USER, actions['results'][0]['sources'])

    def _comment(self, url_action, related, model_name):
        url_delete = '{}/{{}}'.format(url_action)

        # adding by me

        self.client_auth.post(url_action, {'text': 'cool!'})

        self.assertEqual(self.client_auth.get(self.notifications).json()['count'], 0)
        self.assertEqual(self.client_auth.get(*self.explore_args).json()['count'], 0)

        # adding by another user

        parent_id = self.client_auth_1.post(url_action, {'text': 'cool?'}).json()['id']

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_COMMENT)
        self.assertEqual(actions['results'][0]['model'], model_name)
        self.assertTrue(actions['results'][0]['reply_to_your'])
        self.assertEqual(actions['results'][0]['comments']['count'], 1)
        self.assertEqual(actions['results'][0]['comments']['results'][0]['id'], parent_id)
        self.assertIsNone(actions['results'][0]['comments']['results'][0]['parent'])
        for name in related:
            self.assertEqual(actions['results'][0][name]['count'], 1)
        self.assertEqual(self.client_auth.get(*self.explore_args).json()['count'], 0)

        # adding an answer by another user

        self.client_auth_2.post(url_action, {'text': 'cool!', 'parent': parent_id})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_COMMENT)
        self.assertEqual(actions['results'][0]['comments']['count'], 2)
        self.assertFalse(actions['results'][0]['reply_to_your'])
        self.assertEqual(self.client_auth.get(*self.explore_args).json()['count'], 0)

        actions = self.client_auth_1.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_COMMENT)
        self.assertTrue(actions['results'][0]['reply_to_your'])
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 0)

        # adding another answer by another user

        children_id = self.client_auth_3.post(url_action, {'text': 'of course', 'parent': parent_id}).json()['id']

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 3)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_COMMENT)
        self.assertFalse(actions['results'][0]['reply_to_your'])
        self.assertEqual(self.client_auth.get(*self.explore_args).json()['count'], 0)

        actions = self.client_auth_1.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_COMMENT)
        self.assertTrue(actions['results'][0]['reply_to_your'])
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 0)

        actions = self.client_auth_2.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_COMMENT)
        self.assertFalse(actions['results'][0]['reply_to_your'])
        self.assertEqual(self.client_auth_2.get(*self.explore_args).json()['count'], 0)

        # adding another answer by me

        self.client_auth.post(url_action, {'text': 'nope', 'parent': parent_id})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 3)
        self.assertEqual(self.client_auth.get(*self.explore_args).json()['count'], 0)

        actions = self.client_auth_1.get(self.notifications).json()
        self.assertEqual(actions['count'], 3)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_COMMENT)
        self.assertTrue(actions['results'][0]['reply_to_your'])
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 0)

        actions = self.client_auth_2.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_COMMENT)
        self.assertFalse(actions['results'][0]['reply_to_your'])
        self.assertEqual(self.client_auth_2.get(*self.explore_args).json()['count'], 0)

        actions = self.client_auth_3.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_COMMENT)
        self.assertFalse(actions['results'][0]['reply_to_your'])
        self.assertEqual(self.client_auth_3.get(*self.explore_args).json()['count'], 0)

        # deleting a children comment

        self.client_auth_3.delete(url_delete.format(children_id))

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_COMMENT)

        actions = self.client_auth_1.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_COMMENT)

        actions = self.client_auth_2.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_COMMENT)

        actions = self.client_auth_3.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        self.assertEqual(actions['results'][0]['action'], Feed.ACTIONS_ADD_COMMENT)

        # deleting a parent comment

        self.client_auth_1.delete(url_delete.format(parent_id))

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 0)

        actions = self.client_auth_1.get(self.notifications).json()
        self.assertEqual(actions['count'], 0)

        actions = self.client_auth_2.get(self.notifications).json()
        self.assertEqual(actions['count'], 0)

        actions = self.client_auth_3.get(self.notifications).json()
        self.assertEqual(actions['count'], 0)

    def test_added_comment_review(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']
        review_id = self.client_auth.post('/api/reviews', {
            'game': self.game.id,
            'rating': ratings[1]['id'],
            'reactions': [reactions[0]['id'], reactions[3]['id']],
            'text': 'awesome!\nplay right now!',
        }).json()['id']
        Feed.objects.all().delete()

        self._comment('/api/reviews/{}/comments'.format(review_id), ['reviews', 'games'], 'review')

    def test_added_comment_discussion(self):
        discussion_id = self.client_auth.post('/api/discussions', {
            'game': self.game.id,
            'title': 'awesomeness',
            'text': 'awesome!\nplay right now!',
        }).json()['id']
        Feed.objects.all().delete()

        self._comment('/api/discussions/{}/comments'.format(discussion_id), ['discussions', 'games'], 'discussion')

    def test_added_comment_collection_feed(self):
        collection_id = self.client_auth.post('/api/collections', {
            'name': 'awesomeness',
            'description': 'awesome!\nplay right now!',
        }).json()['id']
        collection_game = CollectionGame.objects.create(collection_id=collection_id, game=self.game)
        feed = CollectionFeed.objects.get(collection_id=collection_id,
                                          content_type=ContentType.objects.get_for_model(collection_game),
                                          object_id=collection_game.id)
        Feed.objects.filter(action=Feed.ACTIONS_ADD_GAME_TO_COLLECTION).delete()

        url_action = '/api/collections/{}/feed/{}/comments'.format(collection_id, feed.id)
        self._comment(url_action, ['collections', 'collection_feeds', 'games'], 'collectionfeed')

    def _favorite(self, url_action, related, model_name):
        url_favorite = '{}/{{}}/likes'.format(url_action)
        url_unfavorite = '{}/{{}}/likes/{{}}'.format(url_action)

        # adding a user as a friend

        self.client_auth_4.post('/api/users/current/following/users', {'follow': self.user.id})

        # favorite

        parent_id = self.client_auth.post(url_action, {'text': 'cool!'}).json()['id']
        self.client_auth_1.post(url_favorite.format(parent_id))

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        action = actions['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_FAVORITE_COMMENT)
        self.assertEqual(action['model'], model_name)
        self.assertEqual(action['comments']['count'], 1)
        self.assertEqual(action['comments']['results'][0]['id'], parent_id)
        self.assertIsNone(action['comments']['results'][0]['parent'])
        for name in related:
            self.assertEqual(action[name]['count'], 1)

        self.assertEqual(self.client_auth.get(*self.explore_args).json()['count'], 0)

        self.assertEqual(self.client_auth_4.get(*self.explore_args).json()['count'], 1)

        # favorite twice

        comment_id = self.client_auth.post(url_action, {'text': 'nope', 'parent': parent_id}).json()['id']
        self.client_auth_1.post(url_favorite.format(comment_id))

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 3)
        action = self.client_auth.get(self.notifications).json()['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_FAVORITE_COMMENT)
        self.assertEqual(action['model'], model_name)
        self.assertEqual(action['comments']['count'], 2)
        self.assertEqual(action['comments']['results'][0]['id'], comment_id)
        self.assertEqual(action['comments']['results'][0]['parent'], parent_id)
        self.assertEqual(action['comments']['results'][1]['id'], parent_id)
        for name in related:
            self.assertEqual(action[name]['count'], 1)

        self.assertEqual(self.client_auth.get(*self.explore_args).json()['count'], 0)

        self.assertEqual(self.client_auth_4.get(*self.explore_args).json()['count'], 1)

        # deleting a favorite and deleting a feed

        self.client_auth_1.delete(url_unfavorite.format(comment_id, self.user_1.id))

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)

        # deleting a favorite without deleting a feed

        for feed in Feed.objects.filter(action=Feed.ACTIONS_FAVORITE_COMMENT):
            feed.created = feed.created - timedelta(minutes=Feed.GROUP_MINUTES * 2)
            feed.save(update_fields=['created'])

        self.client_auth_1.delete(url_unfavorite.format(parent_id, self.user_1.id))

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)

    def test_favorite_comment_review(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']
        review_id = self.client_auth.post('/api/reviews', {
            'game': self.game.id,
            'rating': ratings[1]['id'],
            'reactions': [reactions[0]['id'], reactions[3]['id']],
            'text': 'awesome!\nplay right now!',
        }).json()['id']
        Feed.objects.all().delete()

        self._favorite('/api/reviews/{}/comments'.format(review_id), ['reviews', 'games'], 'review')

    def test_favorite_comment_discussion(self):
        discussion_id = self.client_auth.post('/api/discussions', {
            'game': self.game.id,
            'title': 'awesomeness',
            'text': 'awesome!\nplay right now!',
        }).json()['id']
        Feed.objects.all().delete()

        self._favorite('/api/discussions/{}/comments'.format(discussion_id), ['discussions', 'games'], 'discussion')

    def test_favorite_comment_collection_feed(self):
        collection_id = self.client_auth.post('/api/collections', {
            'name': 'awesomeness',
            'description': 'awesome!\nplay right now!',
        }).json()['id']
        collection_game = CollectionGame.objects.create(collection_id=collection_id, game=self.game)
        feed = CollectionFeed.objects.get(collection_id=collection_id,
                                          content_type=ContentType.objects.get_for_model(collection_game),
                                          object_id=collection_game.id)
        Feed.objects.filter(action=Feed.ACTIONS_ADD_GAME_TO_COLLECTION).delete()

        url_action = '/api/collections/{}/feed/{}/comments'.format(collection_id, feed.id)
        self._favorite(url_action, ['collections', 'collection_feeds', 'games'], 'collectionfeed')

    def _like(self, url_action_1, url_action_2, url_action_3, related, model_name):
        # adding a user as a friend

        self.client_auth_4.post('/api/users/current/following/users', {'follow': self.user.id})

        # like

        self.client_auth_1.post('{}/likes'.format(url_action_1))

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)
        action = actions['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_LIKE)
        self.assertEqual(action['model'], model_name)
        for name in related:
            self.assertEqual(action[name]['count'], 1)

        self.assertEqual(self.client_auth.get(*self.explore_args).json()['count'], 0)

        self.assertEqual(self.client_auth_4.get(*self.explore_args).json()['count'], 1)

        # like twice

        self.client_auth_1.post('{}/likes'.format(url_action_2))

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 3)
        action = self.client_auth.get(self.notifications).json()['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_LIKE)
        self.assertEqual(action['model'], model_name)
        for name in related:
            self.assertEqual(action[name]['count'], 1)

        self.assertEqual(self.client_auth.get(*self.explore_args).json()['count'], 0)

        self.assertEqual(self.client_auth_4.get(*self.explore_args).json()['count'], 1)

        # more likes!

        self.client_auth_1.post('{}/likes'.format(url_action_3))

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 4)
        action = self.client_auth.get(self.notifications).json()['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_LIKE)
        self.assertEqual(action['model'], model_name)
        for name in related:
            self.assertEqual(action[name]['count'], 1)

        self.assertEqual(self.client_auth.get(*self.explore_args).json()['count'], 0)

        self.assertEqual(self.client_auth_4.get(*self.explore_args).json()['count'], 1)

        # deleting a like and deleting a feed

        self.client_auth_1.delete('{}/likes/{}'.format(url_action_3, self.user_1.id))

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 3)

        # disliking and deleting a feed

        self.client_auth_1.post('{}/likes'.format(url_action_2), {'positive': False})

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)

        # deleting a like without deleting a feed

        for feed in Feed.objects.filter(action=Feed.ACTIONS_LIKE):
            feed.created = feed.created - timedelta(minutes=Feed.GROUP_MINUTES * 2)
            feed.save(update_fields=['created'])

        self.client_auth_1.delete('{}/likes/{}'.format(url_action_1, self.user_1.id))

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 2)

    def test_like_collection(self):
        collection_1 = self.client_auth.post('/api/collections', {
            'name': 'awesomeness 1',
            'description': 'awesome!\nplay right now!',
        }).json()['id']
        collection_2 = self.client_auth.post('/api/collections', {
            'name': 'awesomeness 2',
            'description': 'awesome!\nplay right now!',
        }).json()['id']
        collection_3 = self.client_auth.post('/api/collections', {
            'name': 'awesomeness 3',
            'description': 'awesome!\nplay right now!',
        }).json()['id']
        Feed.objects.filter(action=Feed.ACTIONS_ADD_GAME_TO_COLLECTION).delete()

        url = '/api/collections/{}'
        url_action_1 = url.format(collection_1)
        url_action_2 = url.format(collection_2)
        url_action_3 = url.format(collection_3)
        self._like(url_action_1, url_action_2, url_action_3, ['collections'], 'collection')

    def test_game_is_released(self):
        self.game.released = now()
        self.game.save()
        self.game_1.released = now() + timedelta(days=1)
        self.game_1.save()

        UserGame.objects.create(user=self.user, game=self.game, status=UserGame.STATUS_TOPLAY)
        UserGame.objects.create(user=self.user_1, game=self.game, status=UserGame.STATUS_TOPLAY)
        UserGame.objects.create(user=self.user_2, game=self.game, status=UserGame.STATUS_OWNED)
        UserGame.objects.create(user=self.user, game=self.game_1, status=UserGame.STATUS_TOPLAY)
        UserGame.objects.create(user=self.user_1, game=self.game_1, status=UserGame.STATUS_TOPLAY)
        UserGame.objects.create(user=self.user_2, game=self.game_1, status=UserGame.STATUS_OWNED)
        UserGame.objects.create(user=self.user_3, game=self.game_3, status=UserGame.STATUS_TOPLAY)

        game_is_released.delay()

        actions = self.client_auth.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        action = actions['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_GAME_IS_RELEASED)
        self.assertEqual(action['games']['results'][0]['name'], self.game.name)

        self.assertEqual(self.client_auth.get(*self.explore_args).json()['count'], 0)

        actions = self.client_auth_1.get(self.notifications).json()
        self.assertEqual(actions['count'], 1)
        action = actions['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_GAME_IS_RELEASED)
        self.assertEqual(action['games']['results'][0]['name'], self.game.name)

        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 0)

        self.assertEqual(self.client_auth_2.get(self.notifications).json()['count'], 0)
        self.assertEqual(self.client_auth_2.get(*self.explore_args).json()['count'], 0)

        self.assertEqual(self.client_auth_3.get(self.notifications).json()['count'], 0)
        self.assertEqual(self.client_auth_3.get(*self.explore_args).json()['count'], 0)

        self.assertEqual(self.client_auth_4.get(self.notifications).json()['count'], 0)
        self.assertEqual(self.client_auth_4.get(*self.explore_args).json()['count'], 0)

        game_is_released.delay()

        self.assertEqual(self.client_auth.get(self.notifications).json()['count'], 1)
        self.assertEqual(self.client_auth.get(*self.explore_args).json()['count'], 0)

        self.assertEqual(self.client_auth_1.get(self.notifications).json()['count'], 1)
        self.assertEqual(self.client_auth_1.get(*self.explore_args).json()['count'], 0)

        self.assertEqual(self.client_auth_2.get(self.notifications).json()['count'], 0)
        self.assertEqual(self.client_auth_2.get(*self.explore_args).json()['count'], 0)

        self.assertEqual(self.client_auth_3.get(self.notifications).json()['count'], 0)
        self.assertEqual(self.client_auth_3.get(*self.explore_args).json()['count'], 0)

        self.assertEqual(self.client_auth_4.get(self.notifications).json()['count'], 0)
        self.assertEqual(self.client_auth_4.get(*self.explore_args).json()['count'], 0)

        self.assertEqual(FeedQueue.objects.count(), 1)
        self.assertEqual(FeedElement.objects.count(), 1)
        self.assertEqual(Feed.objects.count(), 1)
        self.assertEqual(UserFeed.objects.count(), 0)
        self.assertEqual(UserNotifyFeed.objects.count(), 2)

    def test_marked_game_community(self):
        for i in range(0, Feed.MARK_GAME_COMMUNITY['count']):
            user = get_user_model().objects.create(username='user{}'.format(i), email='user{}@test.io'.format(i))
            UserGame.objects.create(user=user, game=self.game, status=UserGame.STATUS_OWNED)

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        action = actions['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_MARK_GAME_COMMUNITY)
        self.assertEqual(action['games']['results'][0]['name'], self.game.name)
        self.assertEqual(action['users']['count'], Feed.MARK_GAME_COMMUNITY['count'])

        self.assertEqual(self.client_auth.get(self.notifications).json()['count'], 0)

    def test_followed_user_community(self):
        for i in range(0, Feed.FOLLOW_USER_COMMUNITY['count']):
            user = get_user_model().objects.create(username='user{}'.format(i), email='user{}@test.io'.format(i))
            UserFollowElement.objects.create(
                user=user, object_id=self.user.id, content_type=CommonContentType().get(get_user_model())
            )

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        action = actions['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_FOLLOW_USER_COMMUNITY)
        self.assertEqual(action['follow']['results'][0]['username'], self.user.username)
        self.assertEqual(action['users']['count'], Feed.FOLLOW_USER_COMMUNITY['count'])
        self.assertNotEqual(action['users']['results'][0]['username'], self.user.username)

        self.assertEqual(
            self.client_auth.get(self.notifications).json()['count'],
            Feed.FOLLOW_USER_COMMUNITY['count']
        )

    def test_offer_to_change_playing(self):
        first = UserGame.objects.create(user=self.user, game=self.game, status=UserGame.STATUS_PLAYING)
        second = UserGame.objects.create(user=self.user_1, game=self.game_1, status=UserGame.STATUS_PLAYING)
        UserGame.objects.all().update(added=monday(now()) - timedelta(days=Feed.OFFER_TO_CHANGE_PLAYING_DAYS + 1))

        offer_change_playing.delay()

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        action = actions['results'][1]
        self.assertEqual(action['action'], Feed.ACTIONS_OFFER_TO_CHANGE_PLAYING)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['games']['results'][0]['name'], self.game.name)

        self.assertEqual(self.client_auth.get(self.notifications).json()['count'], 0)

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        action = actions['results'][1]
        self.assertEqual(action['action'], Feed.ACTIONS_OFFER_TO_CHANGE_PLAYING)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['games']['results'][0]['name'], self.game_1.name)

        self.assertEqual(self.client_auth_1.get(self.notifications).json()['count'], 0)

        # run twice without duplicates

        offer_change_playing.delay()

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)

        # remove

        first.status = UserGame.STATUS_DROPPED
        first.save(update_fields=['status'])

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 0)

        second.delete()

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 0)

    def test_offer_to_rate_game(self):
        first = UserGame.objects.create(user=self.user, game=self.game, status=UserGame.STATUS_BEATEN)
        second = UserGame.objects.create(user=self.user_1, game=self.game_1, status=UserGame.STATUS_BEATEN)
        UserGame.objects.create(user=self.user_2, game=self.game_2, status=UserGame.STATUS_BEATEN)
        UserGame.objects.create(user=self.user_3, game=self.game_3, status=UserGame.STATUS_BEATEN)
        review = Review.objects.create(game=self.game_3, user=self.user_3, rating=Review.RATING_EXCEPTIONAL)

        offer_rate_game.delay()

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        action = actions['results'][1]
        self.assertEqual(action['action'], Feed.ACTIONS_OFFER_TO_RATE_GAME)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['games']['results'][0]['name'], self.game.name)

        self.assertEqual(self.client_auth.get(self.notifications).json()['count'], 0)

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        action = actions['results'][1]
        self.assertEqual(action['action'], Feed.ACTIONS_OFFER_TO_RATE_GAME)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['games']['results'][0]['name'], self.game_1.name)

        self.assertEqual(self.client_auth_1.get(self.notifications).json()['count'], 0)

        actions = self.client_auth_2.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        action = actions['results'][1]
        self.assertEqual(action['action'], Feed.ACTIONS_OFFER_TO_RATE_GAME)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['games']['results'][0]['name'], self.game_2.name)

        self.assertEqual(self.client_auth_2.get(self.notifications).json()['count'], 0)

        actions = self.client_auth_3.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        action = actions['results'][0]
        self.assertNotEqual(action['action'], Feed.ACTIONS_OFFER_TO_RATE_GAME)

        self.assertEqual(self.client_auth_2.get(self.notifications).json()['count'], 0)

        # change a status

        first.status = UserGame.STATUS_DROPPED
        first.save(update_fields=['status'])

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 0)

        # delete a user game

        second.delete()

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 0)

        # add a review

        Review.objects.create(game=self.game_2, user=self.user_2, rating=Review.RATING_EXCEPTIONAL)

        actions = self.client_auth_2.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        action = actions['results'][0]
        self.assertNotEqual(action['action'], Feed.ACTIONS_OFFER_TO_RATE_GAME)

        # remove a review

        review.hidden = True
        review.save(update_fields=['hidden'])

        offer_rate_game.delay()

        actions = self.client_auth_3.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        action = actions['results'][1]
        self.assertEqual(action['action'], Feed.ACTIONS_OFFER_TO_RATE_GAME)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['games']['results'][0]['name'], self.game_3.name)

        # run twice without duplicates

        offer_rate_game.delay()

        actions = self.client_auth_3.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)

    def test_offer_hide(self):
        UserGame.objects.create(user=self.user, game=self.game, status=UserGame.STATUS_PLAYING)
        UserGame.objects.create(user=self.user_1, game=self.game_1, status=UserGame.STATUS_PLAYING)
        UserGame.objects.all().update(added=monday(now()) - timedelta(days=Feed.OFFER_TO_CHANGE_PLAYING_DAYS + 1))

        offer_change_playing.delay()

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)
        action = actions['results'][1]
        self.assertEqual(action['action'], Feed.ACTIONS_OFFER_TO_CHANGE_PLAYING)
        self.assertEqual(action['games']['count'], 1)
        self.assertEqual(action['games']['results'][0]['name'], self.game.name)

        # hide

        response = self.client_auth.post('/api/feed/{}/hide'.format(action['id']))
        self.assertEqual(response.status_code, 200)

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)

        # restore

        response = self.client_auth.post('/api/feed/{}/hide'.format(action['id']))
        self.assertEqual(response.status_code, 200)

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)

        # hide not my

        action = self.client_auth_1.get(*self.explore_args).json()['results'][1]
        response = self.client_auth.post('/api/feed/{}/hide'.format(action['id']))
        self.assertEqual(response.status_code, 404)

        actions = self.client_auth_1.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 2)

    def test_popular_games(self):
        parent_playstation = PlatformParent.objects.create(name='Playstation')
        parent_pc = PlatformParent.objects.create(name='PC')
        playstation = Platform.objects.create(name='Playstation 4', parent=parent_playstation)
        pc = Platform.objects.create(name='PC', parent=parent_pc)
        GamePlatform.objects.create(game=self.game, platform=playstation)
        GamePlatform.objects.create(game=self.game, platform=pc)
        GamePlatform.objects.create(game=self.game_1, platform=playstation)
        GamePlatform.objects.create(game=self.game_1, platform=pc)
        GamePlatform.objects.create(game=self.game_2, platform=playstation)

        ug = UserGame.objects.create(user=self.user, game=self.game, status=UserGame.STATUS_TOPLAY)
        ug.platforms.add(pc)
        ug = UserGame.objects.create(user=self.user_1, game=self.game, status=UserGame.STATUS_TOPLAY)
        ug.platforms.add(pc)
        ug = UserGame.objects.create(user=self.user, game=self.game_1, status=UserGame.STATUS_TOPLAY)
        ug.platforms.add(playstation)
        ug = UserGame.objects.create(user=self.user_1, game=self.game_1, status=UserGame.STATUS_TOPLAY)
        ug.platforms.add(playstation)
        ug = UserGame.objects.create(user=self.user_3, game=self.game_1, status=UserGame.STATUS_OWNED)
        ug.platforms.add(pc)
        ug = UserGame.objects.create(user=self.user_2, game=self.game_2, status=UserGame.STATUS_OWNED)
        ug.platforms.add(playstation)
        UserGame.objects.all().update(created=monday(now()) - timedelta(days=3))

        popular_games.delay()

        actions = self.client_auth.get(*self.explore_args).json()
        action = actions['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_POPULAR_GAMES)
        self.assertEqual(action['platform']['id'], parent_pc.id)
        self.assertEqual(action['games']['count'], 2)
        self.assertEqual(action['games']['results'][0]['name'], self.game.name)
        self.assertEqual(action['games']['results'][1]['name'], self.game_1.name)
        self.assertEqual(action['users_count'], 3)
        self.assertEqual(action['games_count'], 2)
        self.assertEqual(actions['count'], 2)
        action = actions['results'][1]
        self.assertEqual(action['action'], Feed.ACTIONS_POPULAR_GAMES)
        self.assertEqual(action['platform']['id'], parent_playstation.id)
        self.assertEqual(action['games']['count'], 2)
        self.assertEqual(action['games']['results'][0]['name'], self.game_1.name)
        self.assertEqual(action['games']['results'][1]['name'], self.game_2.name)
        self.assertEqual(action['users_count'], 3)
        self.assertEqual(action['games_count'], 2)

        self.assertEqual(self.client_auth.get(self.notifications).json()['count'], 0)

        actions = self.client_auth_2.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        action = actions['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_POPULAR_GAMES)
        self.assertEqual(action['platform']['id'], parent_playstation.id)
        self.assertEqual(action['users_count'], 3)
        self.assertEqual(action['games_count'], 2)

        self.assertEqual(self.client_auth_2.get(self.notifications).json()['count'], 0)

        ug = UserGame.objects.create(user=self.user_3, game=self.game, status=UserGame.STATUS_TOPLAY)
        ug.platforms.add(pc)
        ug = UserGame.objects.create(user=self.user_4, game=self.game, status=UserGame.STATUS_TOPLAY)
        ug.platforms.add(pc)
        UserGame.objects.all().update(created=monday(now()) - timedelta(days=3))

        popular_games.delay()

        actions = self.client_auth_2.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        action = actions['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_POPULAR_GAMES)
        self.assertEqual(action['platform']['id'], parent_playstation.id)
        self.assertEqual(action['games']['results'][0]['name'], self.game_1.name)
        self.assertEqual(action['games']['results'][1]['name'], self.game_2.name)
        self.assertEqual(action['users_count'], 3)
        self.assertEqual(action['games_count'], 2)

        self.assertEqual(self.client_auth_2.get(self.notifications).json()['count'], 0)

    def test_most_rated_games(self):
        Review.objects.create(game=self.game_1, user=self.user, rating=Review.RATING_EXCEPTIONAL)
        Review.objects.create(game=self.game_1, user=self.user_1, rating=Review.RATING_MEH)
        Review.objects.create(game=self.game_2, user=self.user_1, rating=Review.RATING_SKIP)
        Review.objects.create(game=self.game_3, user=self.user_3, rating=Review.RATING_RECOMMENDED)
        Review.objects.all().update(created=monday(now()) - timedelta(days=3))

        most_rated_games.delay()

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        action = actions['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_MOST_RATED_GAMES)
        self.assertEqual(action['games']['count'], 3)
        self.assertEqual(action['games']['results'][0]['name'], self.game_1.name)
        self.assertEqual(action['games']['results'][1]['name'], self.game_3.name)
        self.assertEqual(action['games']['results'][2]['name'], self.game_2.name)
        self.assertEqual(action['users_count'], 3)
        self.assertEqual(action['games_count'], 3)

        self.assertEqual(self.client_auth.get(self.notifications).json()['count'], 0)

        Review.objects.create(game=self.game_3, user=self.user_2, rating=Review.RATING_EXCEPTIONAL)
        Review.objects.create(game=self.game_3, user=self.user_1, rating=Review.RATING_EXCEPTIONAL)
        Review.objects.all().update(created=monday(now()) - timedelta(days=3))

        most_rated_games.delay()

        actions = self.client_auth.get(*self.explore_args).json()
        self.assertEqual(actions['count'], 1)
        action = actions['results'][0]
        self.assertEqual(action['action'], Feed.ACTIONS_MOST_RATED_GAMES)
        self.assertEqual(action['games']['count'], 3)
        self.assertEqual(action['games']['results'][0]['name'], self.game_3.name)
        self.assertEqual(action['games']['results'][1]['name'], self.game_1.name)
        self.assertEqual(action['games']['results'][2]['name'], self.game_2.name)
        self.assertEqual(action['users_count'], 4)
        self.assertEqual(action['games_count'], 3)

        self.assertEqual(self.client_auth.get(self.notifications).json()['count'], 0)
