import json

from django.contrib.auth import get_user_model
from django.http import SimpleCookie
from django.test import Client, TestCase
from rest_framework.authtoken.models import Token

from apps.stat.models import CarouselRating, Story


class ViewsTestCase(TestCase):
    def setUp(self):
        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'}
        self.user = get_user_model().objects.get_or_create(username='curt', email='curt@test.io')[0]
        self.token = Token.objects.get_or_create(user=self.user)[0].key
        self.client = Client(kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = Client(**kwargs)
        super().setUp()

    def test_carousel_rating(self):
        response = self.client.post('/api/stat/carousel-rating', {})
        self.assertEquals(response.status_code, 400)
        self.assertFalse(CarouselRating.objects.count())

        response = self.client.post('/api/stat/carousel-rating', {'action': 'skip'})
        self.assertEquals(response.status_code, 201)
        self.assertTrue(CarouselRating.objects.first().action)

        # ga

        self.client.cookies = SimpleCookie({'_ga': ''})
        response = self.client.post('/api/stat/carousel-rating', {'action': 'review'})
        self.assertEquals(response.status_code, 201)
        self.assertEquals(CarouselRating.objects.first().cid, '')
        self.client.cookies = SimpleCookie()

        self.client.cookies = SimpleCookie({'_ga': 'GA1.2.2011141485.1548179239'})
        response = self.client.post('/api/stat/carousel-rating', {'action': 'review'})
        self.assertEquals(response.status_code, 201)
        self.assertEquals(CarouselRating.objects.first().cid, '2011141485.1548179239')
        self.assertEquals(CarouselRating.objects.first().user_agent, '')
        self.client.cookies = SimpleCookie()

        # slug

        response = self.client.post('/api/stat/carousel-rating', {'action': 'review', 'slug': ''})
        self.assertEquals(response.status_code, 201)
        self.assertEquals(CarouselRating.objects.first().slug, '')

        response = self.client.post(
            '/api/stat/carousel-rating',
            json.dumps({'action': 'skip', 'slug': None}),
            content_type='application/json'
        )
        self.assertEquals(response.status_code, 201)
        self.assertEquals(CarouselRating.objects.first().slug, '')

        response = self.client.post('/api/stat/carousel-rating', {'action': 'review', 'slug': 'top-100'})
        self.assertEquals(response.status_code, 201)
        self.assertEquals(CarouselRating.objects.first().slug, 'top-100')

        # rating

        response = self.client.post('/api/stat/carousel-rating', {'action': 'review', 'rating': ''})
        self.assertEquals(response.status_code, 201)
        self.assertIsNone(CarouselRating.objects.first().rating)

        response = self.client.post(
            '/api/stat/carousel-rating',
            json.dumps({'action': 'skip', 'rating': None}),
            content_type='application/json'
        )
        self.assertEquals(response.status_code, 201)
        self.assertIsNone(CarouselRating.objects.first().rating)

        response = self.client.post('/api/stat/carousel-rating', {'action': 'review', 'rating': 4})
        self.assertEquals(response.status_code, 201)
        self.assertEquals(CarouselRating.objects.first().rating, 4)

        response = self.client.post('/api/stat/carousel-rating', {'action': 'review', 'rating': 6})
        self.assertEquals(response.status_code, 400)

        # auth user

        self.client.cookies = SimpleCookie({'_ga': 'GA1.2.2011141485.1548179239'})
        response = self.client_auth.post(
            '/api/stat/carousel-rating',
            {'action': 'skip'},
            HTTP_USER_AGENT='Big Brother',
        )
        self.assertEquals(response.status_code, 201)
        self.assertTrue(CarouselRating.objects.first().user_id)
        self.assertEquals(CarouselRating.objects.first().user_agent, 'Big Brother')

    def test_story(self):
        response = self.client.post('/api/stat/story', {})
        self.assertEquals(response.status_code, 400)
        self.assertFalse(Story.objects.count())

        response = self.client.post('/api/stat/story', {'second': 5})
        self.assertEquals(response.status_code, 201)
        self.assertTrue(Story.objects.first().second)

        # ga

        self.client.cookies = SimpleCookie({'_ga': ''})
        response = self.client.post('/api/stat/story', {'second': 10})
        self.assertEquals(response.status_code, 201)
        self.assertEquals(Story.objects.first().cid, '')
        self.client.cookies = SimpleCookie()

        self.client.cookies = SimpleCookie({'_ga': 'GA1.2.2011141485.1548179239'})
        response = self.client.post('/api/stat/story', {'second': 15})
        self.assertEquals(response.status_code, 201)
        self.assertEquals(Story.objects.first().cid, '2011141485.1548179239')
        self.assertEquals(Story.objects.first().user_agent, '')
        self.client.cookies = SimpleCookie()

        # domain

        response = self.client.post('/api/stat/story', {'second': 20, 'domain': ''})
        self.assertEquals(response.status_code, 201)
        self.assertEquals(Story.objects.first().domain, '')

        response = self.client.post(
            '/api/stat/story',
            json.dumps({'second': 25, 'domain': None}),
            content_type='application/json'
        )
        self.assertEquals(response.status_code, 201)
        self.assertEquals(Story.objects.first().domain, '')

        response = self.client.post('/api/stat/story', {'second': 10, 'domain': 'kanobu.ru'})
        self.assertEquals(response.status_code, 201)
        self.assertEquals(Story.objects.first().domain, 'kanobu.ru')
