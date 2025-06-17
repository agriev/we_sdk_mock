from unittest.mock import patch

from django.test import Client, TestCase
from django.utils.timezone import now

from apps.banners.cache import BannersMedium
from apps.banners.models import Banner


class ViewsTestCase(TestCase):
    def setUp(self):
        self.client = Client({'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'})
        super().setUp()

    def test_active(self):
        get = self.client.get('/api/banners/active')
        self.assertEqual(get.status_code, 200)
        self.assertIsNone(get.json()['id'])

        banner = Banner.objects.create(text='My banner!', url='https://pyha.ru', url_text='Pyha', active=True)
        get = self.client.get('/api/banners/active')
        self.assertEqual(get.json()['id'], banner.id)
        self.assertEqual(get.json()['text'], banner.text)
        self.assertEqual(get.json()['url'], banner.url)
        self.assertEqual(get.json()['url_text'], banner.url_text)

    @patch.object(BannersMedium, 'fetch_feed')
    def test_medium(self, fetch_feed_mock):
        fetch_feed_mock.return_value = {
            'title': 'My test title',
            'link': 'https://medium.com/rawg/my-test-title',
            'date': now(),
        }

        get = self.client.get('/api/banners/medium')
        self.assertEqual(get.status_code, 200)
        self.assertEqual(get.json()['title'], 'My test title')

    @patch.object(BannersMedium, 'fetch_feed')
    def test_medium_error(self, fetch_feed_mock):
        fetch_feed_mock.side_effect = Exception

        get = self.client.get('/api/banners/medium')
        self.assertEqual(get.status_code, 200)
        self.assertEqual(get.json()['title'], 'Medium')
