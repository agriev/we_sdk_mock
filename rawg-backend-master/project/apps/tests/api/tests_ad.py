from urllib import parse

from django.urls import reverse
from rest_framework import status

from apps.ad.models import AdFoxCompanyParameter
from apps.games.models import Game
from apps.utils.tests import APITestCase


class AdFoxParameterTestCase(APITestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers', 'games_publishers',
        'games_genres', 'games_tags', 'games_games',
    ]

    @classmethod
    def setUpTestData(cls):
        cls.game = Game.objects.first()
        for company in AdFoxCompanyParameter.COMPANY_CHOICES:
            AdFoxCompanyParameter.objects.create(name='p1', value='val1', company=company, game=cls.game),
            AdFoxCompanyParameter.objects.create(name='p2', value='val2', company=company, game=cls.game)
        cls.base_url = reverse('api:adfox_parameters')
        query = {'game_id': cls.game.pk}
        cls.url = parse.urlunparse(('', '', cls.base_url, '', parse.urlencode(query), ''))

    def test_get_game_adfox_parameters(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        db_count_parameters = AdFoxCompanyParameter.objects.filter(game=self.game).count()
        self.assertEqual(response.data['count'], db_count_parameters)
        self.assertEqual(len(response.data['results']), len(AdFoxCompanyParameter.COMPANY_CHOICES))
        for idx, company in enumerate(AdFoxCompanyParameter.COMPANY_CHOICES):
            parameters = AdFoxCompanyParameter.objects.filter(company=company, game=self.game).values('name', 'value')
            self.assertEqual(response.data['results'][idx], {str(company): list(parameters)})

    def test_get_game_adfox_parameters_wrong_game_filter(self):
        url_parts = ['', '', self.base_url, '', '', '']
        invalid_game_ids = ('ID', '', Game.objects.order_by('id').values_list('id', flat=True).last() + 100)
        for game_id in invalid_game_ids:
            url_parts[4] = parse.urlencode({'game_id': game_id})
            response = self.client.get(parse.urlunparse(url_parts))
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['count'], 0)
            self.assertEqual(response.data['results'], [])
