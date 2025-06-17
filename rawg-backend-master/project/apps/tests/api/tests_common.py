from django.test import Client, TransactionTestCase

from apps.credits.models import GamePerson, Person, Position
from apps.games.models import Developer, Game, GamePlatform, Genre, Platform, PlatformParent, Publisher, Tag


class ViewsTestCase(TransactionTestCase):
    fixtures = ['common_lists']

    def setUp(self):
        self.client = Client({'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'})
        super().setUp()

    def test_browse(self):
        with self.assertNumQueries(9):
            response = self.client.get('/api/browse')
        self.assertEqual(response.status_code, 200)

        genre = Genre.objects.create(name='RPG', hidden=False)
        developer_1 = Developer.objects.create(name='Fucked Up')
        developer_2 = Developer.objects.create(name='Thom Yorke')
        publisher = Publisher.objects.create(name='Cat Power')
        tag = Tag.objects.create(name='Music')
        person = Person.objects.create(name='All Them Witches')
        position = Position.objects.create(name='Composer')
        game_1 = Game.objects.create(name='Our Mother Electricity')
        game_1.genres.add(genre)
        game_1.developers.add(developer_1)
        game_2 = Game.objects.create(name='Dosw Your Dreams')
        game_2.developers.add(developer_2)
        game_2.publishers.add(publisher)
        game_2.tags.add(tag)
        parent_platform = PlatformParent.objects.create(name='PC')
        platform = Platform.objects.create(name='PC', parent=parent_platform)
        GamePlatform.objects.create(game=game_1, platform=platform)
        GamePerson.objects.create(game=game_1, person=person, position=position)

        with self.assertNumQueries(10):
            response = self.client.get('/api/browse')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()

        self.assertEqual(response_data['results'][0]['count'], 1)
        self.assertEqual(len(response_data['results'][0]['items']), 1)
        self.assertEqual(response_data['results'][1]['count'], 2)
        self.assertEqual(len(response_data['results'][1]['items']), 2)
        self.assertEqual(response_data['results'][2]['count'], 1)
        self.assertEqual(response_data['results'][3]['count'], 1)
        self.assertEqual(response_data['results'][4]['count'], 0)
        self.assertEqual(response_data['results'][5]['count'], 1)

        with self.assertNumQueries(9):
            response = self.client.get('/api/browse', {'short': True})
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['results'][1]['count'], 2)
        self.assertEqual(len(response_data['results'][1]['items']), 2)
        self.assertNotIn('games', response_data['results'][1]['items'])
