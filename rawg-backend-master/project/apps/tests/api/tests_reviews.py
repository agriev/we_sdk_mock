import json

from django.contrib.auth import get_user_model
from django.test import Client, TestCase, TransactionTestCase
from rest_framework.authtoken.models import Token

from apps.feed.models import Feed
from apps.games.models import Game
from apps.reviews.models import Reaction, Review
from apps.users.models import UserGame


class ReviewsBaseTestCase(object):
    fixtures = ['reviews_reactions']

    # noinspection PyPep8Naming
    def setUp(self):
        self.user = get_user_model().objects.get_or_create(username='curt', email='curt@test.io')[0]
        self.user_1 = get_user_model().objects.get_or_create(username='nick', email='nick@test.io')[0]

        self.token = Token.objects.get_or_create(user=self.user)[0].key
        self.token_1 = Token.objects.get_or_create(user=self.user_1)[0].key

        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'}
        self.client = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token_1)
        self.client_auth_1 = Client(**kwargs)

        self.game = Game.objects.get_or_create(name='Grand Theft Auto: San Andreas')[0]
        self.game_1 = Game.objects.get_or_create(name='Grand Theft Auto: Vice City')[0]
        self.game_2 = Game.objects.create(name='Game 2')
        self.game_3 = Game.objects.create(name='Game 3')
        self.game_4 = Game.objects.create(name='Game 4')
        self.game_5 = Game.objects.create(name='Game 5')
        self.game_6 = Game.objects.create(name='Game 6')

        super().setUp()

    def create(self):
        self.ratings = self.client.get('/api/reviews/ratings').json()['results']
        self.reactions = self.client.get('/api/reviews/reactions').json()['results']
        return self.client_auth.post(
            '/api/reviews', {
                'game': self.game.id,
                'rating': self.ratings[1]['id'],
                'reactions': [self.reactions[0]['id'], self.reactions[3]['id']],
                'text': 'awesome!\nplay right now!',
            },
        ).json()['id']


class ReviewTestCase(ReviewsBaseTestCase, TestCase):
    def test_get_total_user_games_count(self):
        UserGame.objects.create(user=self.user, game=self.game)
        UserGame.objects.create(user=self.user, game=self.game_1)
        UserGame.objects.create(user=self.user, game=self.game_2, status='yet')
        self.assertEqual(self.user.get_real_user_games_count(), 2)

    def test_get_rated_games_percent(self):
        UserGame.objects.create(user=self.user, game=self.game)
        UserGame.objects.create(user=self.user, game=self.game_1)
        self.assertEqual(self.user.get_rated_games_percent(), 0)
        self.create()
        self.assertEqual(self.user.get_rated_games_percent(), 50)

    def test_carousel_queryset(self):
        UserGame.objects.create(user=self.user, game=self.game)
        UserGame.objects.create(user=self.user, game=self.game_1, status='toplay')
        UserGame.objects.create(user=self.user, game=self.game_2, status='yet')
        response = self.client_auth.get('/api/reviews/carousel')
        results = response.json()['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], self.game.id)

    def test_carousel(self):
        UserGame.objects.create(user=self.user, game=self.game)
        with self.assertNumQueries(6):
            response = self.client_auth.get('/api/reviews/carousel')
        self.assertEqual(response.json()['results'][0]['id'], self.game.id)
        self.assertEqual(response.json()['total_games'], 1)
        self.create()
        UserGame.objects.create(user=self.user, game=self.game_1)
        with self.assertNumQueries(6):
            response = self.client_auth.get('/api/reviews/carousel')
        self.assertEqual(response.json()['results'][0]['id'], self.game_1.id)
        self.assertEqual(response.json()['total_games'], 2)

    def test_carousel_top100(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        with self.assertNumQueries(1):
            response = self.client.get('/api/reviews/carousel/top100')
        self.assertGreater(len(response.json()['results']), 0)

        first_game_id = response.json()['results'][0]['id']
        data = {
            'game': first_game_id,
            'rating': ratings[1]['id']
        }
        post = self.client_auth.post('/api/reviews', data)
        self.assertEqual(post.status_code, 201)

        with self.assertNumQueries(3):
            response = self.client_auth.get('/api/reviews/carousel/top100')
        self.assertGreater(len(response.json()['results']), 0)
        self.assertNotIn(first_game_id, [game['id'] for game in response.json()['results']])

    def test_post(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']
        data = {
            'game': self.game.id,
            'rating': ratings[1]['id'],
            'reactions': [reactions[0]['id'], reactions[3]['id']],
            'add_to_library': True,
        }
        post = self.client_auth.post('/api/reviews', data)
        pk = post.json()['id']
        self.assertEqual(post.status_code, 201)
        self.assertEqual(self.client.post('/api/reviews', data).status_code, 401)

        game = self.client_auth.get('/api/games/{}'.format(self.game.id)).json()
        self.assertEqual(game['user_review']['id'], pk)

        games = self.client_auth.get('/api/games?id={}'.format(self.game.id)).json()
        game_rating = None
        for game in games['results']:
            if game['id'] == self.game.id:
                game_rating = game
        self.assertEqual(game_rating['user_review']['id'], pk)
        self.assertEqual(game_rating['user_review']['rating'], data['rating'])
        self.assertEqual(game_rating['user_review']['is_text'], False)

        self.assertIn(
            self.game.id,
            UserGame.objects.filter(user=self.user).values_list('game_id', flat=True)
        )

    def test_post_batch(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        games = Game.objects.all()[:3]
        data = {'games': [], 'add_to_library': True}
        for game in games:
            data['games'].append({
                'game': game.id,
                'rating': ratings[1]['id'],
            })
        post = self.client_auth.post(
            '/api/reviews',
            json.dumps(data),
            content_type='application/json',
        )
        self.assertEqual(post.status_code, 201)
        self.assertIn(
            games.first().id,
            list(UserGame.objects.filter(user_id=self.user.id).values_list('game_id', flat=True))
        )
        self.assertIn(
            games.first().id,
            list(Review.objects.filter(user_id=self.user.id).values_list('game_id', flat=True))
        )

    def test_post_text(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']
        post = self.client_auth.post(
            '/api/reviews', {
                'game': self.game.id,
                'rating': ratings[1]['id'],
                'reactions': [reactions[0]['id'], reactions[3]['id']],
                'text': 'awesome!<br>play right now!',
            },
        )
        self.assertEqual(post.status_code, 201)
        self.assertEqual(post.json()['text'], 'awesome!<br/>play right now!')
        self.assertEqual(post.json()['is_text'], True)

    def test_post_preview_only_br(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        response = self.client_auth.post(
            '/api/reviews', {
                'game': self.game.id,
                'rating': ratings[1]['id'],
                'text': ' <br> ',
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('text', response.json().keys())

    def test_post_required(self):
        post = self.client_auth.post('/api/reviews')
        self.assertEqual(post.status_code, 400)
        data = post.json()
        self.assertEqual(len(data), 2)
        self.assertIn('game', data.keys())
        self.assertIn('rating', data.keys())

    def test_patch(self):
        pk = self.create()

        kwargs = {'data': json.dumps({'text': 'cool'}), 'content_type': 'application/json'}
        patch = self.client_auth.patch('/api/reviews/{}'.format(pk), **kwargs)
        self.assertEqual(patch.status_code, 200)
        self.assertEqual(patch.json()['text'], 'cool')

        kwargs = {'data': json.dumps({'rating': self.ratings[2]['id']}), 'content_type': 'application/json'}
        patch = self.client_auth.patch('/api/reviews/{}'.format(pk), **kwargs)
        self.assertEqual(patch.status_code, 200)
        self.assertEqual(patch.json()['rating'], self.ratings[2]['id'])

        patch = self.client_auth_1.patch('/api/reviews/{}'.format(pk), **kwargs)
        self.assertEqual(patch.status_code, 403)

    def test_patch_game(self):
        pk = self.create()
        patch = self.client_auth.patch(
            '/api/reviews/{}'.format(pk), json.dumps({'game': self.game_1.id}),
            content_type='application/json',
        )
        self.assertEqual(patch.status_code, 200)
        self.assertEqual(patch.json()['game']['id'], self.game.id)

    def test_delete(self):
        pk = self.create()
        self.assertEqual(self.client_auth_1.get('/api/reviews/{}'.format(pk)).json()['can_delete'], False)
        self.assertEqual(self.client_auth_1.delete('/api/reviews/{}'.format(pk)).status_code, 403)
        self.assertEqual(self.client_auth.get('/api/reviews/{}'.format(pk)).json()['can_delete'], True)
        with self.assertNumQueries(10):
            response = self.client_auth.delete('/api/reviews/{}'.format(pk))
        self.assertEqual(response.status_code, 202)

    def test_delete_and_create(self):
        pk = self.create()
        self.assertEqual(self.client_auth.delete('/api/reviews/{}'.format(pk)).status_code, 202)
        self.assertIsNot(self.create(), pk)

    def test_ratings(self):
        ratings = self.client.get('/api/reviews/ratings')
        self.assertEqual(ratings.status_code, 200)
        self.assertEqual(ratings.json()['count'], len(Review.RATINGS))
        self.assertEqual(self.client_auth.get('/api/reviews/ratings').status_code, 200)

    def test_reactions(self):
        reactions = self.client.get('/api/reviews/reactions')
        self.assertEqual(reactions.status_code, 200)
        self.assertEqual(reactions.json()['count'], Reaction.objects.count())
        self.assertEqual(self.client_auth.get('/api/reviews/reactions').status_code, 200)


class ReviewTransactionTestCase(ReviewsBaseTestCase, TransactionTestCase):
    def test_lists_main(self):
        self.create()
        response = self.client.get('/api/reviews/lists/main')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 1)

    def test_post_and_check_noindex(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']
        post = self.client_auth.post(
            '/api/reviews', {
                'game': self.game.id,
                'rating': ratings[1]['id'],
                'reactions': [reactions[0]['id'], reactions[3]['id']],
            },
        )
        self.assertEqual(post.status_code, 201)

        get = self.client_auth.get(f'/api/reviews/{post.json()["id"]}')
        self.assertEqual(get.json()['is_text'], False)
        self.assertEqual(get.json()['noindex'], True)

        post_text = self.client_auth.post(
            '/api/reviews', {
                'game': self.game.id,
                'rating': ratings[1]['id'],
                'reactions': [reactions[0]['id'], reactions[3]['id']],
                'text': 'awesome!<br>play right now!',
            },
        )
        self.assertEqual(post_text.status_code, 201)
        self.assertEqual(post_text.json()['text'], 'awesome!<br/>play right now!')

        get_text = self.client_auth.get(f'/api/reviews/{post_text.json()["id"]}')
        self.assertTrue(get_text.json()['is_text'])
        self.assertFalse(get_text.json()['noindex'])

    def test_list(self):
        response = self.client.get('/api/reviews')
        self.assertEqual(response.status_code, 200)

        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']
        self.client_auth.post('/api/reviews', {
            'game': self.game.id,
            'rating': ratings[1]['id'],
            'reactions': [reactions[0]['id'], reactions[3]['id']],
            'add_to_library': True,
            'text': 'test',
        })

        response = self.client.get('/api/reviews')
        self.assertEqual(response.json()['count'], 1)

    def test_post_empty_text(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']
        post = self.client_auth.post(
            '/api/reviews', {
                'game': self.game.id,
                'rating': ratings[1]['id'],
                'reactions': [reactions[0]['id'], reactions[3]['id']],
                'text': '',
            },
        )

        review = Review.objects.get(id=post.json()['id'])
        self.assertEqual(review.text, '')
        self.assertEqual(review.language_detection, 0)
        self.assertIs(review.language, '')
        self.assertFalse(review.is_text)

    def test_post_and_erase(self):
        pk = self.create()

        before = Feed.objects.filter(action=Feed.ACTIONS_ADD_REVIEW).count()

        kwargs = {'data': json.dumps({'text': ''}), 'content_type': 'application/json'}
        self.client_auth.patch('/api/reviews/{}'.format(pk), **kwargs)

        after = Feed.objects.filter(action=Feed.ACTIONS_ADD_REVIEW).count()
        self.assertEqual(before, after + 1)


class LikeTestCase(ReviewsBaseTestCase, TestCase):
    def test_delete(self):
        pk = self.create()
        action = '/api/reviews/{}/likes/{}'.format(pk, self.user.id)
        self.client_auth.post('/api/reviews/{}/likes'.format(pk))
        self.assertEqual(self.client.delete(action).status_code, 401)
        self.assertEqual(self.client_auth_1.delete(action).status_code, 403)
        self.assertEqual(self.client_auth.delete(action).status_code, 204)


class LikeTransactionTestCase(ReviewsBaseTestCase, TransactionTestCase):
    def test_post(self):
        pk = self.create()
        action = '/api/reviews/{}/likes'.format(pk)
        self.assertEqual(self.client_auth.post(action).status_code, 201)
        self.assertEqual(self.client.post(action).status_code, 401)
        self.assertEqual(self.client_auth.post(action, {'positive': False}).status_code, 201)
        self.assertEqual(self.client.post(action, {'positive': False}).status_code, 401)

    def test_user_like(self):
        pk = self.create()
        action = '/api/reviews/{}/likes'.format(pk)
        review = '/api/reviews/{}'.format(pk)
        reviews = '/api/games/{}/reviews'.format(self.game.id)

        self.client_auth_1.post(action)

        self.assertEqual(self.client_auth_1.get(review).json()['user_like'], 'positive')
        self.assertEqual(self.client_auth.get(review).json()['user_like'], False)
        self.assertEqual(self.client_auth.get(reviews).json()['your']['user_like'], False)

        self.client_auth_1.post(action, {'positive': False})

        self.assertEqual(self.client_auth_1.get(review).json()['user_like'], 'negative')
        self.assertEqual(self.client_auth.get(review).json()['user_like'], False)
        self.assertEqual(self.client_auth_1.get(reviews).json()['results'][0]['user_like'], 'negative')
        self.assertEqual(self.client_auth.get(reviews).json()['your']['user_like'], False)

        self.client_auth_1.delete('{}/{}'.format(action, self.user_1.id))

        self.assertEqual(self.client_auth_1.get(review).json()['user_like'], False)
        self.assertEqual(self.client_auth.get(review).json()['user_like'], False)
        self.assertEqual(self.client_auth_1.get(reviews).json()['results'][0]['user_like'], False)
        self.assertEqual(self.client_auth.get(reviews).json()['your']['user_like'], False)

    def test_likes_count(self):
        pk = self.create()
        action = '/api/reviews/{}/likes'.format(pk)
        review_action = '/api/reviews/{}'.format(pk)
        reviews_action = '/api/games/{}/reviews'.format(self.game.id)

        self.client_auth.post(action)

        review = self.client_auth.get(review_action).json()
        reviews = self.client_auth_1.get(reviews_action).json()
        self.assertEqual(review['likes_count'], 1)
        self.assertEqual(review['likes_rating'], 1)
        self.assertEqual(review['likes_positive'], 1)

        self.client_auth_1.post(action, {'positive': False})

        review = self.client_auth.get(review_action).json()
        reviews = self.client_auth_1.get(reviews_action).json()
        self.assertEqual(review['likes_count'], 2)
        self.assertEqual(review['likes_rating'], 0)
        self.assertEqual(review['likes_positive'], 1)
        self.assertEqual(reviews['results'][0]['likes_count'], 2)
        self.assertEqual(reviews['results'][0]['likes_rating'], 0)
        self.assertEqual(reviews['results'][0]['likes_positive'], 1)

        self.client_auth_1.post(action)

        review = self.client_auth.get(review_action).json()
        reviews = self.client_auth_1.get(reviews_action).json()
        self.assertEqual(review['likes_count'], 2)
        self.assertEqual(review['likes_rating'], 2)
        self.assertEqual(review['likes_positive'], 2)

        self.client_auth_1.delete('{}/{}'.format(action, self.user_1.id))

        review = self.client_auth.get(review_action).json()
        reviews = self.client_auth_1.get(reviews_action).json()
        self.assertEqual(review['likes_count'], 1)
        self.assertEqual(review['likes_rating'], 1)
        self.assertEqual(review['likes_positive'], 1)


class CommentTestCase(ReviewsBaseTestCase, TestCase):
    def test_post(self):
        review_id = self.create()
        action = '/api/reviews/{}/comments'.format(review_id)

        data = {'text': 'cool!'}
        post = self.client_auth.post(action, data)
        parent_id = post.json()['id']
        self.assertEqual(post.status_code, 201)

        data['parent'] = parent_id
        post = self.client_auth.post(action, data)
        self.assertEqual(post.status_code, 201)

        data['parent'] = post.json()['id']
        self.assertEqual(self.client_auth.post(action, data).json()['parent'], parent_id)

        self.assertEqual(self.client.post(action, data).status_code, 401)

    def test_patch(self):
        review_id = self.create()
        pk = self.client_auth.post('/api/reviews/{}/comments'.format(review_id), {'text': 'cool!'}).json()['id']
        action = '/api/reviews/{}/comments/{}'.format(review_id, pk)
        kwargs = {'data': json.dumps({'text': 'cool?'}), 'content_type': 'application/json'}

        patch = self.client_auth.patch(action, **kwargs)
        self.assertEqual(patch.status_code, 200)
        self.assertEqual(patch.json()['text'], 'cool?')

        patch = self.client_auth_1.patch(action, **kwargs)
        self.assertEqual(patch.status_code, 403)

    def test_patch_parent(self):
        review_id = self.create()
        action = '/api/reviews/{}/comments'.format(review_id)
        pk1 = self.client_auth.post(action, {'text': 'cool!'}).json()['id']
        pk2 = self.client_auth.post(action, {'text': 'coolest'}).json()['id']
        pk3 = self.client_auth.post(action, {'text': 'cool?', 'parent': pk1}).json()['id']

        action = '/api/reviews/{}/comments/{}'.format(review_id, pk3)
        patch = self.client_auth.patch(action, json.dumps({'parent': pk2}), content_type='application/json')
        self.assertEqual(patch.status_code, 200)
        self.assertEqual(patch.json()['parent'], pk1)

    def test_delete(self):
        review_id = self.create()
        pk = self.client_auth.post('/api/reviews/{}/comments'.format(review_id), {'text': 'cool!'}).json()['id']
        action = '/api/reviews/{}/comments/{}'.format(review_id, pk)

        self.assertEqual(self.client_auth_1.get(action).json()['can_delete'], False)
        self.assertEqual(self.client_auth_1.delete(action).status_code, 403)
        self.assertEqual(self.client_auth.get(action).json()['can_delete'], True)
        self.assertEqual(self.client_auth.delete(action).status_code, 204)


class CommentTransactionTestCase(ReviewsBaseTestCase, TransactionTestCase):
    def test_counters(self):
        review_id = self.create()
        post = '/api/reviews/{}/comments'.format(review_id)
        action = '/api/reviews/{}'.format(review_id)

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

    def test_attached(self):
        review_id = self.create()
        post = '/api/reviews/{}/comments'.format(review_id)
        action = '/api/games/{}/reviews'.format(self.game.id)

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

        self.client_auth.post('/api/reviews/{}/comments/{}/likes'.format(review_id, id1))
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 1)
        self.assertEqual(comments['results'][0]['id'], id1)

        self.client_auth.delete('/api/reviews/{}/comments/{}/likes/{}'.format(review_id, id1, self.user.pk))
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 2)
        self.assertEqual(comments['results'][0]['id'], id1)
        self.assertEqual(comments['results'][1]['id'], id2)

        self.client_auth.post('/api/reviews/{}/comments/{}/likes'.format(review_id, id1))
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 1)
        self.assertEqual(comments['results'][0]['id'], id1)

        self.client_auth.delete('{}/{}'.format(post, id1))
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 1)
        self.assertEqual(comments['results'][0]['id'], id2)

        self.client_auth.delete('{}/{}'.format(post, id2))
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 0)


class CommentLikeTestCase(ReviewsBaseTestCase, TestCase):
    def test_post(self):
        review_id = self.create()
        pk = self.client_auth.post('/api/reviews/{}/comments'.format(review_id), {'text': 'cool!'}).json()['id']
        action = '/api/reviews/{}/comments/{}/likes'.format(review_id, pk)

        self.assertEqual(self.client_auth.post(action).status_code, 201)
        self.assertEqual(self.client.post(action).status_code, 401)

    def test_delete(self):
        review_id = self.create()
        pk = self.client_auth.post('/api/reviews/{}/comments'.format(review_id), {'text': 'cool!'}).json()['id']
        action = '/api/reviews/{}/comments/{}/likes/{}'.format(review_id, pk, self.user.id)

        self.client_auth.post('/api/reviews/{}/comments/{}/likes'.format(review_id, pk))
        self.assertEqual(self.client.delete(action).status_code, 401)
        self.assertEqual(self.client_auth_1.delete(action).status_code, 403)
        self.assertEqual(self.client_auth.delete(action).status_code, 204)

    def test_user_like(self):
        review_id = self.create()
        pk = self.client_auth.post('/api/reviews/{}/comments'.format(review_id), {'text': 'cool!'}).json()['id']
        action = '/api/reviews/{}/comments/{}/likes'.format(review_id, pk)
        review = '/api/reviews/{}/comments/{}'.format(review_id, pk)
        reviews = '/api/reviews/{}/comments'.format(review_id)

        self.client_auth_1.post(action)

        self.assertEqual(self.client_auth_1.get(review).json()['user_like'], True)
        self.assertEqual(self.client_auth.get(review).json()['user_like'], False)
        self.assertEqual(self.client_auth_1.get(reviews).json()['results'][0]['user_like'], True)
        self.assertEqual(self.client_auth.get(reviews).json()['results'][0]['user_like'], False)

        self.client_auth_1.delete('{}/{}'.format(action, self.user_1.id))

        self.assertEqual(self.client_auth_1.get(review).json()['user_like'], False)
        self.assertEqual(self.client_auth.get(review).json()['user_like'], False)
        self.assertEqual(self.client_auth_1.get(reviews).json()['results'][0]['user_like'], False)
        self.assertEqual(self.client_auth.get(reviews).json()['results'][0]['user_like'], False)


class CommentLikeTransactionTestCase(ReviewsBaseTestCase, TransactionTestCase):
    def test_likes_count(self):
        review_id = self.create()
        pk = self.client_auth.post('/api/reviews/{}/comments'.format(review_id), {'text': 'cool!'}).json()['id']
        action = '/api/reviews/{}/comments/{}/likes'.format(review_id, pk)
        review_action = '/api/reviews/{}/comments/{}'.format(review_id, pk)
        reviews_action = '/api/reviews/{}/comments'.format(review_id)

        self.client_auth.post(action)

        review = self.client_auth.get(review_action).json()
        reviews = self.client_auth_1.get(reviews_action).json()
        self.assertEqual(review['likes_count'], 1)
        self.assertEqual(reviews['results'][0]['likes_count'], 1)

        self.client_auth_1.post(action)

        review = self.client_auth.get(review_action).json()
        reviews = self.client_auth_1.get(reviews_action).json()
        self.assertEqual(review['likes_count'], 2)
        self.assertEqual(reviews['results'][0]['likes_count'], 2)

        self.client_auth_1.delete('{}/{}'.format(action, self.user_1.id))

        review = self.client_auth.get(review_action).json()
        reviews = self.client_auth_1.get(reviews_action).json()
        self.assertEqual(review['likes_count'], 1)
        self.assertEqual(reviews['results'][0]['likes_count'], 1)

    def test_like_in_feed(self):
        review_id = self.create()
        pk = self.client_auth.post('/api/reviews/{}/comments'.format(review_id), {'text': 'cool!'}).json()['id']

        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user.id})

        self.assertFalse(self.client_auth_1.get('/api/feed/explore', {'ordering': '-created'}).json()
                         ['results'][1]['reviews']['results'][0]['comments']['results'][0]['user_like'])

        self.client_auth_1.post('/api/reviews/{}/comments/{}/likes'.format(review_id, pk))

        self.assertTrue(self.client_auth_1.get('/api/feed/explore', {'ordering': '-created'}).json()
                        ['results'][1]['reviews']['results'][0]['comments']['results'][0]['user_like'])
