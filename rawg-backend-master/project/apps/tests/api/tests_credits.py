from django.contrib.auth import get_user_model
from django.test import Client, TestCase, TransactionTestCase
from rest_framework.authtoken.models import Token

from apps.credits.models import GamePerson, Person, Position
from apps.games.models import Game, GamePlatform, Platform, PlatformParent
from apps.utils.tasks import merge_items


class ViewsTransactionTestCase(TransactionTestCase):
    fixtures = ['common_lists']

    def setUp(self):
        self.user, _ = get_user_model().objects.get_or_create(username='liam', email='liam@test.io')
        self.token = Token.objects.get_or_create(user=self.user)[0].key
        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'}
        self.client = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = Client(**kwargs)
        super().setUp()

    def test_persons(self):
        person = Person.objects.create(name='All Them Witches')
        position = Position.objects.create(name='Composer')
        game = Game.objects.create(name='Our Mother Electricity')
        parent_platform = PlatformParent.objects.create(name='PC')
        platform = Platform.objects.create(name='PC', parent=parent_platform)
        GamePlatform.objects.create(game=game, platform=platform)
        GamePerson.objects.create(game=game, person=person, position=position)

        # list

        with self.assertNumQueries(5):
            response = self.client.get('/api/creators', HTTP_X_API_CLIENT='website')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['results'][0]['name'], person.name)
        self.assertEqual(response_data['results'][0]['positions'][0]['name'], position.name)
        self.assertEqual(response_data['results'][0]['games'][0]['name'], game.name)
        self.assertIn('seo_title', response_data)
        self.assertIn('seo_description', response_data)
        self.assertIn('seo_h1', response_data)

        # retrieve

        with self.assertNumQueries(4):
            response = self.client.get('/api/creators/{}'.format(person.slug), HTTP_X_API_CLIENT='website')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['name'], person.name)
        self.assertEqual(response_data['positions'][0]['name'], position.name)
        self.assertEqual(response_data['platforms']['results'][0]['platform']['name'], platform.name)
        self.assertIn('ratings', response_data)
        self.assertIn('timeline', response_data)
        self.assertIn('seo_title', response_data)
        self.assertIn('seo_description', response_data)
        self.assertIn('seo_h1', response_data)

    def test_persons_moved_merged_persons(self):
        person_one = Person.objects.create(name='Jimmy')
        person_one_slug = person_one.slug
        person_two = Person.objects.create(name='Jim')
        person_two_slug = person_two.slug

        merge_items(person_one.id, [person_two.id], Person._meta.app_label, Person._meta.model_name)

        response = self.client.get('/api/creators/{}'.format(person_one_slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertTrue(response_data['redirect'])
        self.assertEqual(response_data['slug'], person_two_slug)

        response = self.client.get('/api/creators/{}'.format(person_two_slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertNotIn('redirect', response_data)

        person_two = Person.objects.get(slug=person_two_slug)
        person_three = Person.objects.create(name='Jix')
        person_three_slug = person_three.slug

        merge_items(person_one.id, [person_three.id], Person._meta.app_label, Person._meta.model_name)

        response = self.client.get('/api/creators/{}'.format(person_one_slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertTrue(response_data['redirect'])

        response = self.client.get('/api/creators/{}'.format(person_two_slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertTrue(response_data['redirect'])

        response = self.client.get('/api/creators/{}'.format(person_three_slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertNotIn('redirect', response_data)

    def test_persons_create(self):
        # post

        slug = 'liam-gallagher'
        person = {
            'name': 'Liam Gallagher',
            'description': 'a cool guy',
        }
        response = self.client_auth.post('/api/creators', person)

        self.assertEqual(response.status_code, 201)
        data = self.client_auth.get(f'/api/creators/{slug}').json()
        self.assertEqual(data['name'], person['name'])
        self.assertIn(person['description'], data['description'])

        response = self.client_auth.post('/api/creators', person)
        self.assertEqual(response.status_code, 400)

        # patch

        person = {
            'name': 'Noel Gallagher',
            'description': 'also cool guy',
        }
        response = self.client_auth.patch(f'/api/creators/{slug}', person, content_type='application/json')

        self.assertEqual(response.status_code, 200)
        data = self.client_auth.get(f'/api/creators/{slug}').json()
        self.assertEqual(data['name'], person['name'])
        self.assertIn(person['description'], data['description'])

        # delete

        response = self.client_auth.delete(f'/api/creators/{slug}')

        self.assertEqual(response.status_code, 403)

        self.user.is_staff = True
        self.user.save(update_fields=['is_staff'])
        response = self.client_auth.delete(f'/api/creators/{slug}')

        self.assertEqual(response.status_code, 204)
        response = self.client_auth.get(f'/api/creators/{slug}')
        self.assertEqual(response.status_code, 404)


class PositionsTestCase(TestCase):
    fixtures = ['common_lists']

    def setUp(self):
        self.client = Client({'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'})
        self.position = Position.objects.create(name='Composer')
        super().setUp()

    def test_creator_roles(self):
        response = self.client.get('/api/creator-roles')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertGreater(len(response_data['results']), 0)
