import os
from shutil import copyfile

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse
from rest_framework.authtoken.models import Token

from apps.common.utils import get_share_image_url
from apps.discussions.models import Discussion
from apps.games.models import Collection, CollectionGame, Game, ScreenShot
from apps.reviews.models import Review


class ViewsTestCase(TestCase):
    def setUp(self):
        self.image = os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'image_1.jpg')
        self.client = Client()
        self.user, _ = get_user_model().objects.get_or_create(username='curt', email='curt@test.io')
        self.token = Token.objects.get_or_create(user=self.user)[0].key
        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest', 'HTTP_TOKEN': 'Token {}'.format(self.token)}
        self.client_auth = Client(**kwargs)
        super().setUp()

    def test_discussion(self):
        game = Game.objects.create(name='Game')
        screen = ScreenShot.objects.create(game=game, source='https://google.com/image.jpg')
        with open(self.image, 'rb') as f:
            screen.image.save('image.jpg', f)
        screen.save()
        user = get_user_model().objects.create(username='test', email='test@test.io')
        discussion = Discussion.objects.create(game=game, user=user, title='My awesome title!', text='ok')

        url_path = 'api_image:discussion'

        url = get_share_image_url(discussion, url_path)
        url = url.replace(f'/{discussion.share_folder}/{discussion.share_name}', '/0/0')
        get = self.client.get(url)
        self.assertEqual(get.status_code, 302)

        url = get_share_image_url(discussion, url_path)
        get = self.client.get(url)
        self.assertEqual(get.status_code, 200)

    def test_review(self):
        game = Game.objects.create(name='Game')
        screen = ScreenShot.objects.create(game=game, source='https://google.com/image.jpg')
        with open(self.image, 'rb') as f:
            screen.image.save('image.jpg', f)
        screen.save()
        user = get_user_model().objects.create(username='test', email='test@test.io')
        review = Review.objects.create(game=game, user=user, rating=Review.RATING_EXCEPTIONAL)

        url_path = 'api_image:review'

        url = get_share_image_url(review, url_path)
        url = url.replace(f'/{review.share_folder}/{review.share_name}', '/0/0')
        get = self.client.get(url)
        self.assertEqual(get.status_code, 302)

        url = get_share_image_url(review, url_path)
        get = self.client.get(url)
        self.assertEqual(get.status_code, 200)

    def test_collection(self):
        game = Game.objects.create(name='Game')
        screen = ScreenShot.objects.create(game=game, source='https://google.com/image.jpg')
        with open(self.image, 'rb') as f:
            screen.image.save('image.jpg', f)
        screen.save()
        user = get_user_model().objects.create(username='test', email='test@test.io')
        collection = Collection.objects.create(creator=user, name='Collection')
        CollectionGame.objects.create(collection=collection, game=game)

        url_path = 'api_image:collection'

        url = get_share_image_url(collection, url_path)
        url = url.replace(f'/{collection.share_folder}/{collection.share_name}', '/0/0')
        get = self.client.get(url)
        self.assertEqual(get.status_code, 302)

        url = get_share_image_url(collection, url_path)
        get = self.client.get(url)
        self.assertEqual(get.status_code, 200)

    def test_user(self):
        game = Game.objects.create(name='Game')
        screen = ScreenShot.objects.create(game=game, source='https://google.com/image.jpg')
        with open(self.image, 'rb') as f:
            screen.image.save('image.jpg', f)
        screen.save()
        user = get_user_model().objects.create(username='test', email='test@test.io', game_background=game)

        url_path = 'api_image:user'

        url = get_share_image_url(user, url_path)
        url = url.replace(f'/{user.share_folder}/{user.share_name}', '/0/0')
        get = self.client.get(url)
        self.assertEqual(get.status_code, 302)

        url = get_share_image_url(user, url_path)
        get = self.client.get(url)
        self.assertEqual(get.status_code, 200)

    def test_resize(self):
        copyfile(self.image, os.path.join(settings.MEDIA_ROOT, 'image.jpg'))
        get = self.client.get('{}?path=/media/resize/200/-/image.jpg'.format(reverse('api_image:resize')))
        self.assertEqual(get.status_code, 200)
        get = self.client.get('{}?path=/media/crop/150/150/image.jpg'.format(reverse('api_image:resize')))
        self.assertEqual(get.status_code, 200)
        get = self.client.get('{}?path=/media/resize/222/-/image.jpg'.format(reverse('api_image:resize')))
        self.assertEqual(get.status_code, 404)
        get = self.client.get('{}?path=/media/crop/666/333/image.jpg'.format(reverse('api_image:resize')))
        self.assertEqual(get.status_code, 404)

    def test_resize_vulnerability(self):
        get = self.client.get('{}?path=/media/resize/200/-//../../etc/passwd'.format(reverse('api_image:resize')))
        self.assertEqual(get.status_code, 400)

    def test_user_image(self):
        with open(self.image, 'rb') as fp:
            get = self.client.post(reverse('api:userimage-list'), {'image': fp}, format='multipart')
            self.assertEqual(get.status_code, 401)

        with open(self.image, 'rb') as fp:
            get = self.client_auth.post(reverse('api:userimage-list'), {'image': fp}, format='multipart')
            self.assertEqual(get.status_code, 201)
            self.assertTrue(get.json()['image'].endswith('.jpg'))
