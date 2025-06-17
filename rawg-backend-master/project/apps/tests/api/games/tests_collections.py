import json

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.test import Client, TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework.authtoken.models import Token

from api.comments.paginations import CommentPagination
from apps.games.models import Collection, CollectionFeed, CollectionGame, Game, GamePlatform, Platform, PlatformParent

from . import GamesBaseTestCase


class CollectionsTestCase(GamesBaseTestCase, TestCase):
    def setUp(self):
        super().setUp()
        self.collection, _ = Collection.objects.get_or_create(name='My first collection', creator=self.user)
        self.collection_num, _ = Collection.objects.get_or_create(name='1601', creator=self.user)
        self.game = Game.objects.exclude(image_background__isnull=True).first()

    def test_collections(self):
        self.assertEqual(self.client.get('/api/collections').status_code, 200)

    def test_collections_collection(self):
        retrieve = '/api/collections/{}'
        self.assertEqual(self.client.get(retrieve.format('not-found-collection')).status_code, 404)
        self.assertEqual(self.client.get(retrieve.format(self.collection.id)).status_code, 200)
        self.assertEqual(self.client.get(retrieve.format(self.collection.slug)).status_code, 200)
        self.assertEqual(self.client.get(retrieve.format(self.collection_num.id)).status_code, 200)
        self.assertEqual(self.client.get(retrieve.format(self.collection_num.slug)).status_code, 200)
        self.assertTrue(self.client.get(retrieve.format(self.collection.slug)).json()['noindex'])

    def test_collections_collection_games(self):
        retrieve = '/api/collections/{}/games'
        self.assertEqual(self.client.get(retrieve.format('not-found-collection')).status_code, 404)
        self.assertEqual(self.client.get(retrieve.format(self.collection.id)).status_code, 200)
        self.assertEqual(self.client.get(retrieve.format(self.collection.slug)).status_code, 200)
        self.assertEqual(self.client.get(retrieve.format(self.collection_num.id)).status_code, 200)
        self.assertEqual(self.client.get(retrieve.format(self.collection_num.slug)).status_code, 200)

    def test_collections_collection_games_filtering(self):
        parent_platform = PlatformParent.objects.create(name='PC')
        platform = Platform.objects.create(name='PC', parent=parent_platform)
        GamePlatform.objects.create(game=self.game, platform=platform)
        CollectionGame.objects.create(collection=self.collection, game=self.game)
        retrieve = f'/api/collections/{self.collection.slug}/games'

        with self.assertNumQueries(3):
            response = self.client.get(retrieve, {'platforms': platform.id, 'ordering': '-rating'})
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

        with self.assertNumQueries(3):
            response = self.client.get(retrieve, {'parent_platforms': parent_platform.id})
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

        with self.assertNumQueries(2):
            response = self.client.get(retrieve, {'dates': '2001-01-01,2001-12-31'})
        self.assertEqual(response.status_code, 200)

    def test_collections_collection_games_id(self):
        create = self.client_auth.post(
            '/api/collections/{}/games'.format(self.collection.slug),
            {'games': [self.game.id]},
        )
        self.assertEqual(create.status_code, 201)

        create = self.client_auth.post('/api/collections', {'name': self.collection.id, 'description': 'new'})
        self.assertEqual(create.status_code, 201)

        retrieve = self.client.get('/api/collections/{}/games'.format(create.json()['slug'])).json()
        self.assertEquals(retrieve['count'], 0)

    def test_collections_collection_followers(self):
        retrieve = '/api/collections/{}/followers'
        self.assertEqual(self.client.get(retrieve.format('not-found-collection')).status_code, 404)
        self.assertEqual(self.client.get(retrieve.format(self.collection.id)).status_code, 200)

    def test_collections_lists_main(self):
        collection = Collection.objects.create(name='My collection', creator=self.user, on_main=True)
        CollectionGame.objects.create(collection=collection, game=self.game)
        self.assertEqual(self.client.get('/api/collections/lists/main').status_code, 200)


class CollectionsTransactionTestCase(GamesBaseTestCase, TransactionTestCase):
    def setUp(self):
        super().setUp()
        self.collection, _ = Collection.objects.get_or_create(name='My first collection', creator=self.user)
        self.game1 = Game.objects.exclude(image_background__isnull=True).first()
        self.game2 = Game.objects.exclude(image_background__isnull=True).last()

    def test_collections_collection(self):
        background = self.client_auth.patch(
            '/api/collections/{}'.format(self.collection.slug),
            json.dumps({'game_background': self.game1.id}),
            content_type='application/json',
        )
        self.assertEqual(background.status_code, 200)
        self.assertTrue(background.json()['game_background']['url'].endswith(self.game1.image_background))
        self.assertEqual(Collection.objects.get(id=self.collection.id).game_background_id, self.game1.id)

    def test_collections_collection_games(self):
        games_url = '/api/collections/{}/games'.format(self.collection.slug)
        retrieve_url = '/api/collections/{}'.format(self.collection.id)

        # check creating and a games_count

        create_data = {'games': [self.game1.id]}
        create = self.client.post(games_url, create_data)
        self.assertEqual(create.status_code, 401)
        create = self.client_auth.post(games_url, create_data)
        self.assertEqual(create.status_code, 201)

        retrieve = self.client.get(retrieve_url).json()
        self.assertEqual(retrieve['games_count'], 1)

        # check a games_count and a user_completed

        create_data = {'games': [self.game2.id]}
        create = self.client_auth.post(games_url, create_data)
        self.assertEqual(create.status_code, 201)

        retrieve = self.client_auth.get(retrieve_url).json()
        self.assertEqual(retrieve['games_count'], 2)
        self.assertEqual(retrieve['user_games']['count'], 0)
        self.assertEqual(retrieve['user_games']['percent'], 0)

        # check a user_completed

        self.client_auth.post('/api/users/current/games', {'game': self.game1.id})

        retrieve = self.client_auth.get(retrieve_url).json()
        self.assertEqual(retrieve['user_games']['count'], 1)
        self.assertEqual(retrieve['user_games']['percent'], 50)

        self.client_auth.post('/api/users/current/games', {'game': self.game2.id})

        retrieve = self.client_auth.get(retrieve_url).json()
        self.assertEqual(retrieve['user_games']['count'], 2)
        self.assertEqual(retrieve['user_games']['percent'], 100)

        # check a games_count after deleting

        delete = self.client_auth.delete('{}/{}'.format(games_url, self.game2.id))
        self.assertEqual(delete.status_code, 204)

        retrieve = self.client.get(retrieve_url).json()
        self.assertEqual(retrieve['games_count'], 1)

    def test_collection_api_views(self):
        games_url = '/api/collections/{}/games'
        all_url = '/api/collections'
        popular_url = '/api/collections/lists/popular'

        create_data = {'games': [self.game1.id]}
        create = self.client_auth.post(games_url.format(self.collection.slug), create_data)
        self.assertEqual(create.status_code, 201)

        self.collection_2, _ = Collection.objects.get_or_create(name='second collection', creator=self.user)

        create = self.client_auth.post(games_url.format(self.collection_2.slug), create_data)
        self.assertEqual(create.status_code, 201)

        with self.assertNumQueries(3):
            retrieve_all = self.client.get(all_url).json()

        self.assertEqual(
            retrieve_all['results'][0]['slug'],
            self.collection_2.slug,
        )

        self.collection_2.on_main = True
        self.collection_2.save(update_fields=['on_main'])

        with self.assertNumQueries(4):
            retrieve_popular = self.client.get(popular_url).json()

        self.assertEqual(
            retrieve_popular['results'][0]['slug'],
            self.collection_2.slug,
        )


class CollectionFeedTransactionTestCase(GamesBaseTestCase, TransactionTestCase):
    def setUp(self):
        super().setUp()
        self.collection, _ = Collection.objects.get_or_create(name='My first collection', creator=self.user)
        self.game1 = Game.objects.exclude(image_background__isnull=True).first()
        self.game2 = Game.objects.exclude(image_background__isnull=True).last()
        self.game3 = Game.objects.exclude(id__in=[self.game1.id, self.game2.id]).first()

    def test_flow(self):
        collection_url = '/api/collections/{}'.format(self.collection.slug)
        games_url = '{}/games'.format(collection_url)
        feed_url = '{}/feed'.format(collection_url)
        offers_url = '{}/offers'.format(collection_url)

        # check creating and a count and a game

        create_data = {'games': [self.game1.id]}
        self.client_auth.post(games_url, create_data)

        retrieve = self.client.get(feed_url).json()
        self.assertEqual(retrieve['count'], 1)
        self.assertEqual(retrieve['results'][0]['game']['id'], self.game1.id)

        # check creating and a count and a game

        create_data = {'games': [self.game2.id]}
        self.client_auth.post(games_url, create_data)

        retrieve = self.client.get(feed_url).json()
        self.assertEqual(retrieve['count'], 2)
        self.assertEqual(retrieve['results'][0]['game']['id'], self.game2.id)

        # check deleting and a count and a game

        delete = self.client_auth.delete('{}/{}'.format(games_url, self.game2.id))
        self.assertEqual(delete.status_code, 204)

        retrieve = self.client.get(feed_url).json()
        self.assertEqual(retrieve['count'], 1)
        self.assertEqual(retrieve['results'][0]['game']['id'], self.game1.id)

        # check an instance changing

        user_game = CollectionGame.objects.get(game=self.game1, collection=self.collection)
        user_game.game = self.game2
        user_game.save()

        retrieve = self.client.get(feed_url).json()
        self.assertEqual(retrieve['count'], 1)
        self.assertEqual(retrieve['results'][0]['game']['id'], self.game2.id)

        # check creating with a comment

        create_data = {'game': self.game1.id, 'text': 'my<br>formatted<br>text'}
        create = self.client_auth.post(feed_url, create_data)
        pk = create.json()['id']
        self.assertEqual(create.status_code, 201)

        create = self.client_auth.post(feed_url, create_data)
        self.assertEqual(create.status_code, 400)
        self.assertEqual(len(create.json()['game']), 1)

        retrieve = self.client.get(feed_url).json()
        self.assertEqual(retrieve['count'], 2)
        self.assertEqual(retrieve['results'][0]['game']['id'], self.game1.id)
        self.assertEqual(retrieve['results'][0]['text'], 'my<br/>formatted<br/>text')

        retrieve = self.client.get(games_url).json()
        self.assertEqual(retrieve['count'], 2)
        self.assertEqual(retrieve['results'][0]['id'], self.game1.id)

        self.assertEqual(self.client.get(collection_url).json()['posts_count'], 0)

        # check editing

        kwargs = {'data': json.dumps({'text': 'my clean text'}), 'content_type': 'application/json'}
        result = self.client_auth.patch('{}/{}'.format(feed_url, pk), **kwargs)
        self.assertEqual(result.status_code, 200)

        retrieve = self.client.get(feed_url).json()
        self.assertEqual(retrieve['count'], 2)
        self.assertEqual(retrieve['results'][0]['game']['id'], self.game1.id)
        self.assertEqual(retrieve['results'][0]['text'], 'my clean text')

        # check deleting

        delete = self.client_auth.delete('{}/{}'.format(feed_url, pk))
        self.assertEqual(delete.status_code, 204)

        retrieve = self.client.get(feed_url).json()
        self.assertEqual(retrieve['count'], 1)
        self.assertEqual(retrieve['results'][0]['game']['id'], self.game2.id)
        self.assertIsNone(retrieve['results'][0]['user'])
        feed_id = retrieve['results'][0]['id']

        retrieve = self.client.get(games_url).json()
        self.assertEqual(retrieve['count'], 1)
        self.assertEqual(retrieve['results'][0]['id'], self.game2.id)

        # check a page number

        page = self.client_auth.get('{}/{}/page'.format(feed_url, feed_id))
        self.assertEqual(page.status_code, 200)
        self.assertEqual(page.json()['page'], 1)

        # check offer accepting by a feed url

        self.client_auth_1.post(offers_url, {'games': [self.game3.id]})
        post_data = self.client_auth.post(feed_url, {'game': self.game3.id}).json()
        self.assertEqual(post_data['user']['id'], self.user_1.id)

        retrieve = self.client.get(feed_url).json()
        self.assertEqual(retrieve['count'], 2)
        self.assertEqual(retrieve['results'][0]['game']['id'], self.game3.id)
        self.assertEqual(retrieve['results'][0]['user']['id'], self.user_1.id)
        self.assertEqual(self.client.get(offers_url).json()['count'], 0)

        # check offering

        self.client_auth_1.post(offers_url, {'games': [self.game1.id]})
        self.client_auth.post(games_url, {'games': [self.game1.id]})

        retrieve = self.client.get(feed_url).json()
        self.assertEqual(retrieve['count'], 3)
        self.assertEqual(retrieve['results'][0]['game']['id'], self.game1.id)
        self.assertEqual(retrieve['results'][0]['user']['id'], self.user_1.id)

        # check attaching of a review

        ratings = self.client.get('/api/reviews/ratings').json()['results']
        review = self.client_auth.post(
            '/api/reviews', {
                'game': self.game1.id,
                'rating': ratings[1]['id'],
                'text': '!<br>',
            },
        ).json()
        create_data = {'review': review['id'], 'text': 'my<br>formatted<br>text1'}
        create = self.client_auth.post(feed_url, create_data)
        self.assertEqual(create.status_code, 201)

        retrieve = self.client.get(feed_url).json()
        self.assertEqual(retrieve['count'], 4)
        self.assertEqual(retrieve['results'][0]['review']['id'], review['id'])
        self.assertEqual(retrieve['results'][0]['text'], 'my<br/>formatted<br/>text1')
        self.assertEqual(self.client.get(collection_url).json()['posts_count'], 1)

        retrieve_review = self.client_auth.get('/api/reviews/{}'.format(review['id'])).json()
        self.assertEqual(retrieve_review['posts_count'], 1)
        self.assertTrue(retrieve_review['user_post'])

        self.assertTrue(self.client_auth
                        .get('/api/users/current/collections/review/{}'.format(review['id']))
                        .json()[0]['item_in_collection'])

        # check attaching of a review comment

        comment_review = self.client_auth.post(
            '/api/reviews/{}/comments'.format(review['id']),
            {'text': 'cool!'},
        ).json()
        create_data = {'review': review['id'], 'comment': comment_review['id'], 'text': 'my<br>formatted<br>text3'}
        create = self.client_auth.post(feed_url, create_data)
        self.assertEqual(create.status_code, 201)

        retrieve = self.client.get(feed_url).json()
        self.assertEqual(retrieve['count'], 5)
        self.assertEqual(retrieve['results'][0]['review']['id'], review['id'])
        self.assertEqual(retrieve['results'][0]['comment']['id'], comment_review['id'])
        self.assertEqual(retrieve['results'][0]['text'], 'my<br/>formatted<br/>text3')
        self.assertEqual(self.client.get(collection_url).json()['posts_count'], 2)

        retrieve_comment = self.client_auth\
            .get('/api/reviews/{}/comments/{}'.format(review['id'], comment_review['id'])).json()
        self.assertEqual(retrieve_comment['posts_count'], 1)
        self.assertTrue(retrieve_comment['user_post'])

        self.assertTrue(self.client_auth
                        .get('/api/users/current/collections/review_comment/{}'.format(comment_review['id']))
                        .json()[0]['item_in_collection'])

        # check attaching of a discussion

        discussion = self.client_auth.post(
            '/api/discussions', {
                'game': self.game2.id,
                'title': 'my question!',
                'text': 'my text',
            },
        ).json()
        create_data = {'discussion': discussion['id'], 'text': 'my<br>formatted<br>text2'}
        create = self.client_auth.post(feed_url, create_data)
        self.assertEqual(create.status_code, 201)

        retrieve = self.client.get(feed_url).json()
        self.assertEqual(retrieve['count'], 6)
        self.assertEqual(retrieve['results'][0]['discussion']['id'], discussion['id'])
        self.assertEqual(retrieve['results'][0]['text'], 'my<br/>formatted<br/>text2')
        self.assertEqual(self.client.get(collection_url).json()['posts_count'], 3)

        retrieve_discussion = self.client_auth.get('/api/discussions/{}'.format(discussion['id'])).json()
        self.assertEqual(retrieve_discussion['posts_count'], 1)
        self.assertTrue(retrieve_discussion['user_post'])

        self.assertTrue(self.client_auth
                        .get('/api/users/current/collections/discussion/{}'.format(discussion['id']))
                        .json()[0]['item_in_collection'])

        # check attaching of a discussion comment

        comment_discussion = self.client_auth.post(
            '/api/discussions/{}/comments'.format(discussion['id']),
            {'text': 'cool?'},
        ).json()
        create_data = {
            'discussion': discussion['id'], 'comment': comment_discussion['id'],
            'text': 'my<br>formatted<br>text4',
        }
        create = self.client_auth.post(feed_url, create_data)
        self.assertEqual(create.status_code, 201)

        retrieve = self.client.get(feed_url).json()
        self.assertEqual(retrieve['count'], 7)
        self.assertEqual(retrieve['results'][0]['discussion']['id'], discussion['id'])
        self.assertEqual(retrieve['results'][0]['comment']['id'], comment_discussion['id'])
        self.assertEqual(retrieve['results'][0]['text'], 'my<br/>formatted<br/>text4')

        collection = self.client.get(collection_url).json()
        self.assertEqual(collection['posts_count'], 4)

        retrieve_comment = self.client_auth \
            .get('/api/discussions/{}/comments/{}'.format(discussion['id'], comment_discussion['id'])).json()
        self.assertEqual(retrieve_comment['posts_count'], 1)
        self.assertTrue(retrieve_comment['user_post'])

        self.assertTrue(self.client_auth
                        .get('/api/users/current/collections/discussion_comment/{}'.format(comment_discussion['id']))
                        .json()[0]['item_in_collection'])

        # check deleting

        was = retrieve['count']
        was_collection = collection['posts_count']
        for i in range(0, 4):
            delete = self.client_auth.delete('{}/{}'.format(feed_url, retrieve['results'][i]['id']))
            self.assertEqual(delete.status_code, 204)
            self.assertEqual(self.client.get(feed_url).json()['count'], was - (i + 1))
            self.assertEqual(self.client.get(collection_url).json()['posts_count'], was_collection - (i + 1))

        retrieve_review = self.client_auth.get('/api/reviews/{}'.format(review['id'])).json()
        self.assertEqual(retrieve_review['posts_count'], 0)
        self.assertFalse(retrieve_review['user_post'])

        retrieve_comment = self.client_auth \
            .get('/api/reviews/{}/comments/{}'.format(review['id'], comment_review['id'])).json()
        self.assertEqual(retrieve_comment['posts_count'], 0)
        self.assertFalse(retrieve_comment['user_post'])

        retrieve_discussion = self.client_auth.get('/api/discussions/{}'.format(discussion['id'])).json()
        self.assertEqual(retrieve_discussion['posts_count'], 0)
        self.assertFalse(retrieve_discussion['user_post'])

        retrieve_comment = self.client_auth \
            .get('/api/discussions/{}/comments/{}'.format(discussion['id'], comment_discussion['id'])).json()
        self.assertEqual(retrieve_comment['posts_count'], 0)
        self.assertFalse(retrieve_comment['user_post'])

        self.assertFalse(self.client_auth
                         .get('/api/users/current/collections/review/{}'.format(review['id']))
                         .json()[0]['item_in_collection'])

        self.assertFalse(self.client_auth
                         .get('/api/users/current/collections/review_comment/{}'.format(comment_review['id']))
                         .json()[0]['item_in_collection'])

        self.assertFalse(self.client_auth
                         .get('/api/users/current/collections/discussion/{}'.format(discussion['id']))
                         .json()[0]['item_in_collection'])

        self.assertFalse(self.client_auth
                         .get('/api/users/current/collections/discussion_comment/{}'.format(comment_discussion['id']))
                         .json()[0]['item_in_collection'])


class CollectionFeedCommentTestCase(TransactionTestCase):
    def setUp(self):
        self.game = Game.objects.create(name='My game')
        self.user, _ = get_user_model().objects.get_or_create(username='curt', email='curt@test.io')
        self.user_1, _ = get_user_model().objects.get_or_create(username='nick', email='nick@test.io')
        self.collection, _ = Collection.objects.get_or_create(name='My first collection', creator=self.user)
        collection_game, _ = CollectionGame.objects.get_or_create(collection=self.collection, game=self.game)
        self.feed = CollectionFeed.objects.get(
            collection=self.collection,
            content_type=ContentType.objects.get_for_model(collection_game),
            object_id=collection_game.id,
        )
        self.token = Token.objects.get_or_create(user=self.user)[0].key
        self.token_1 = Token.objects.get_or_create(user=self.user_1)[0].key
        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'}
        self.client = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token_1)
        self.client_auth_1 = Client(**kwargs)
        super().setUp()

    def test_get(self):
        action = '/api/collections/{}/feed/{}/comments'.format(self.collection.slug, self.feed.id)
        retrieve = self.client_auth.get(action)
        self.assertEqual(retrieve.status_code, 200)

    def test_post(self):
        action = '/api/collections/{}/feed/{}/comments'.format(self.collection.slug, self.feed.id)

        data = {'text': 'cool!'}
        post = self.client_auth.post(action, data)
        parent_id = post.json()['id']
        self.assertEqual(post.status_code, 201)

        data['parent'] = parent_id
        post = self.client_auth.post(action, data)
        self.assertEqual(post.status_code, 201)

        data['parent'] = post.json()['id']
        post = self.client_auth.post(action, data)
        self.assertEqual(self.client_auth.post(action, data).json()['parent'], parent_id)

        self.assertEqual(self.client.post(action, data).status_code, 401)

    def test_patch(self):
        pk = self.client_auth.post(
            '/api/collections/{}/feed/{}/comments'.format(self.collection.slug, self.feed.id),
            {'text': 'cool!'},
        ).json()['id']
        action = '/api/collections/{}/feed/{}/comments/{}'.format(self.collection.id, self.feed.id, pk)
        kwargs = {'data': json.dumps({'text': 'cool?'}), 'content_type': 'application/json'}

        result = self.client_auth.patch(action, **kwargs)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['text'], 'cool?')

        result = self.client_auth_1.patch(action, **kwargs)
        self.assertEqual(result.status_code, 403)

    def test_delete(self):
        pk = self.client_auth.post(
            '/api/collections/{}/feed/{}/comments'.format(self.collection.slug, self.feed.id),
            {'text': 'cool!'},
        ).json()['id']
        action = '/api/collections/{}/feed/{}/comments/{}'.format(self.collection.id, self.feed.id, pk)

        self.assertEqual(self.client_auth_1.get(action).json()['can_delete'], False)
        self.assertEqual(self.client_auth_1.delete(action).status_code, 403)
        self.assertEqual(self.client_auth.get(action).json()['can_delete'], True)
        self.assertEqual(self.client_auth.delete(action).status_code, 204)

    def test_counters(self):
        post = '/api/collections/{}/feed/{}/comments'.format(self.collection.slug, self.feed.id)
        action = '/api/collections/{}/feed/{}'.format(self.collection.slug, self.feed.id)

        data = {'text': 'cool!'}
        id1 = self.client_auth.post(post, data).json()['id']
        response_data = self.client.get(action).json()
        self.assertEqual(response_data['comments_count'], 1)
        self.assertEqual(response_data['comments_parent_count'], 1)

        data = {'text': 'coolest'}
        id2 = self.client_auth.post(post, data).json()['id']
        response_data = self.client.get(action).json()
        self.assertEqual(response_data['comments_count'], 2)
        self.assertEqual(response_data['comments_parent_count'], 2)

        data = {'text': 'cool?', 'parent': id1}
        self.client_auth_1.post(post, data)
        response_data = self.client.get(action).json()
        self.assertEqual(response_data['comments_count'], 3)
        self.assertEqual(response_data['comments_parent_count'], 2)
        self.assertEqual(self.client.get(post).json()['results'][0]['comments_count'], 1)

        self.client_auth.delete('{}/{}'.format(post, id1))
        response_data = self.client.get(action).json()
        self.assertEqual(response_data['comments_count'], 1)
        self.assertEqual(response_data['comments_parent_count'], 1)

        self.client_auth.delete('{}/{}'.format(post, id2))
        response_data = self.client.get(action).json()
        self.assertEqual(response_data['comments_count'], 0)
        self.assertEqual(response_data['comments_parent_count'], 0)

    def test_children(self):
        action = '/api/collections/{}/feed/{}/comments'.format(self.collection.slug, self.feed.id)
        data = {'text': 'cool!'}
        post = self.client_auth.post(action, data)
        data['parent'] = post.json()['id']
        post = self.client_auth.post(action, data)

        children = self.client_auth.get('{}/{}/children'.format(action, data['parent']))
        self.assertEqual(children.status_code, 200)
        self.assertEqual(children.json()['results'][0]['id'], post.json()['id'])

    def test_page(self):
        action = '/api/collections/{}/feed/{}/comments'.format(self.collection.slug, self.feed.id)
        pk = self.client_auth.post(action, {'text': 'cool!'}).json()['id']

        page = self.client_auth.get('{}/{}/page'.format(action, pk))
        self.assertEqual(page.status_code, 200)
        self.assertEqual(page.json()['page'], 1)

    def test_last(self):
        post = '/api/collections/{}/feed/{}/comments'.format(self.collection.slug, self.feed.id)
        action = '/api/collections/{}/feed'.format(self.collection.slug)

        data = {'text': 'cool!'}
        id1 = self.client_auth.post(post, data).json()['id']
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 1)
        self.assertEqual(comments['results'][0]['id'], id1)

        data = {'text': 'coolest'}
        id2 = self.client_auth.post(post, data).json()['id']
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 2)
        self.assertEqual(comments['results'][0]['id'], id1)
        self.assertEqual(comments['results'][1]['id'], id2)

        data = {'text': 'cool?', 'parent': id1}
        self.client_auth_1.post(post, data)
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 2)
        self.assertEqual(comments['results'][0]['id'], id1)
        self.assertEqual(comments['results'][1]['id'], id2)

        self.client_auth.delete('{}/{}'.format(post, id1))
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 1)
        self.assertEqual(comments['results'][0]['id'], id2)

        self.client_auth.delete('{}/{}'.format(post, id2))
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 0)

        data = {'text': 'cool!'}
        for i in range(0, CommentPagination.page_size + 1):
            self.client_auth.post(post, data).json()

        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], CommentPagination.page_size + 1)
        self.assertTrue(comments['next'].endswith('?page=2'))

        url = reverse('api:commentcollectionfeed-list', args=[self.feed.collection_id, self.feed.id])
        comments_actual = self.client.get(url).json()['results']
        for i, comment in enumerate(comments_actual):
            self.assertEqual(comment['id'], comments['results'][i]['id'])


class CollectionFeedCommentLikeTestCase(TransactionTestCase):
    def setUp(self):
        self.game = Game.objects.create(name='My game')
        self.user, _ = get_user_model().objects.get_or_create(username='curt', email='curt@test.io')
        self.user_1, _ = get_user_model().objects.get_or_create(username='nick', email='nick@test.io')
        self.collection, _ = Collection.objects.get_or_create(name='My first collection', creator=self.user)
        collection_game, _ = CollectionGame.objects.get_or_create(collection=self.collection, game=self.game)
        self.feed = CollectionFeed.objects.get(
            collection=self.collection,
            content_type=ContentType.objects.get_for_model(collection_game),
            object_id=collection_game.id,
        )
        self.token = Token.objects.get_or_create(user=self.user)[0].key
        self.token_1 = Token.objects.get_or_create(user=self.user_1)[0].key
        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'}
        self.client = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token_1)
        self.client_auth_1 = Client(**kwargs)
        super().setUp()

    def test_post(self):
        collection_id = self.collection.slug
        pk = self.client_auth.post(
            '/api/collections/{}/feed/{}/comments'.format(collection_id, self.feed.id),
            {'text': 'cool!'},
        ).json()['id']
        action = '/api/collections/{}/feed/{}/comments/{}/likes'.format(collection_id, self.feed.id, pk)

        self.assertEqual(self.client_auth.post(action).status_code, 201)
        self.assertEqual(self.client.post(action).status_code, 401)

    def test_delete(self):
        collection_id = self.collection.slug
        pk = self.client_auth.post(
            '/api/collections/{}/feed/{}/comments'.format(collection_id, self.feed.id),
            {'text': 'cool!'},
        ).json()['id']
        action = '/api/collections/{}/feed/{}/comments/{}/likes/{}'.format(
            collection_id, self.feed.id, pk,
            self.user.id,
        )

        self.client_auth.post('/api/collections/{}/feed/{}/comments/{}/likes'.format(collection_id, self.feed.id, pk))
        self.assertEqual(self.client.delete(action).status_code, 401)
        self.assertEqual(self.client_auth_1.delete(action).status_code, 403)
        self.assertEqual(self.client_auth.delete(action).status_code, 204)

    def test_user_like(self):
        collection_id = self.collection.slug
        pk = self.client_auth.post(
            '/api/collections/{}/feed/{}/comments'.format(collection_id, self.feed.id),
            {'text': 'cool!'},
        ).json()['id']
        action = '/api/collections/{}/feed/{}/comments/{}/likes'.format(collection_id, self.feed.id, pk)
        collection = '/api/collections/{}/feed/{}/comments/{}'.format(collection_id, self.feed.id, pk)
        collections = '/api/collections/{}/feed/{}/comments'.format(collection_id, self.feed.id)

        self.client_auth_1.post(action)

        self.assertEqual(self.client_auth_1.get(collection).json()['user_like'], True)
        self.assertEqual(self.client_auth.get(collection).json()['user_like'], False)
        self.assertEqual(self.client_auth_1.get(collections).json()['results'][0]['user_like'], True)
        self.assertEqual(self.client_auth.get(collections).json()['results'][0]['user_like'], False)

        self.client_auth_1.delete('{}/{}'.format(action, self.user_1.id))

        self.assertEqual(self.client_auth_1.get(collection).json()['user_like'], False)
        self.assertEqual(self.client_auth.get(collection).json()['user_like'], False)
        self.assertEqual(self.client_auth_1.get(collections).json()['results'][0]['user_like'], False)
        self.assertEqual(self.client_auth.get(collections).json()['results'][0]['user_like'], False)

    def test_likes_count(self):
        collection_id = self.collection.slug
        pk = self.client_auth.post(
            '/api/collections/{}/feed/{}/comments'.format(collection_id, self.feed.id),
            {'text': 'cool!'},
        ).json()['id']
        action = '/api/collections/{}/feed/{}/comments/{}/likes'.format(collection_id, self.feed.id, pk)
        collection_action = '/api/collections/{}/feed/{}/comments/{}'.format(collection_id, self.feed.id, pk)
        collections_action = '/api/collections/{}/feed/{}/comments'.format(collection_id, self.feed.id)

        self.client_auth.post(action)

        collection = self.client_auth.get(collection_action).json()
        collections = self.client_auth_1.get(collections_action).json()
        self.assertEqual(collection['likes_count'], 1)
        self.assertEqual(collections['results'][0]['likes_count'], 1)

        self.client_auth_1.post(action)

        collection = self.client_auth.get(collection_action).json()
        collections = self.client_auth_1.get(collections_action).json()
        self.assertEqual(collection['likes_count'], 2)
        self.assertEqual(collections['results'][0]['likes_count'], 2)

        self.client_auth_1.delete('{}/{}'.format(action, self.user_1.id))

        collection = self.client_auth.get(collection_action).json()
        collections = self.client_auth_1.get(collections_action).json()
        self.assertEqual(collection['likes_count'], 1)
        self.assertEqual(collections['results'][0]['likes_count'], 1)


class CollectionLikeTestCase(GamesBaseTestCase, TestCase):
    def test_delete(self):
        pk = Collection.objects.create(name='My collection', creator=self.user).id
        action = '/api/collections/{}/likes/{}'.format(pk, self.user.id)
        self.client_auth.post('/api/collections/{}/likes'.format(pk))
        self.assertEqual(self.client.delete(action).status_code, 401)
        self.assertEqual(self.client_auth_1.delete(action).status_code, 403)
        self.assertEqual(self.client_auth.delete(action).status_code, 204)


class CollectionLikeTransactionTestCase(GamesBaseTestCase, TransactionTestCase):
    def test_post(self):
        pk = Collection.objects.create(name='My collection', creator=self.user).id
        action = '/api/collections/{}/likes'.format(pk)
        self.assertEqual(self.client_auth.post(action).status_code, 201)
        self.assertEqual(self.client.post(action).status_code, 401)
        self.assertEqual(self.client_auth.post(action, {'count': 3}).status_code, 201)
        self.assertEqual(self.client.post(action, {'count': 3}).status_code, 401)

    def test_user_like(self):
        pk = Collection.objects.create(name='My collection', creator=self.user).id
        action = '/api/collections/{}/likes'.format(pk)
        collection = '/api/collections/{}'.format(pk)

        self.client_auth_1.post(action)

        self.assertEqual(self.client_auth_1.get(collection).json()['user_like'], 1)
        self.assertEqual(self.client_auth.get(collection).json()['user_like'], 0)

        self.client_auth_1.post(action, {'count': 3})

        self.assertEqual(self.client_auth_1.get(collection).json()['user_like'], 3)
        self.assertEqual(self.client_auth.get(collection).json()['user_like'], 0)

        self.client_auth_1.delete('{}/{}'.format(action, self.user_1.id))

        self.assertEqual(self.client_auth_1.get(collection).json()['user_like'], 0)
        self.assertEqual(self.client_auth.get(collection).json()['user_like'], 0)

    def test_likes_count(self):
        pk = Collection.objects.create(name='My collection', creator=self.user).id
        action = '/api/collections/{}/likes'.format(pk)
        collection_action = '/api/collections/{}'.format(pk)

        self.client_auth.post(action)

        review = self.client_auth.get(collection_action).json()
        self.assertEqual(review['likes_count'], 1)
        self.assertEqual(review['likes_users'], 1)

        self.client_auth_1.post(action, {'count': 3})

        review = self.client_auth.get(collection_action).json()
        self.assertEqual(review['likes_count'], 4)
        self.assertEqual(review['likes_users'], 2)

        self.client_auth_1.post(action)

        review = self.client_auth.get(collection_action).json()
        self.assertEqual(review['likes_count'], 2)
        self.assertEqual(review['likes_users'], 2)

        self.client_auth_1.delete('{}/{}'.format(action, self.user_1.id))

        review = self.client_auth.get(collection_action).json()
        self.assertEqual(review['likes_count'], 1)
        self.assertEqual(review['likes_users'], 1)
