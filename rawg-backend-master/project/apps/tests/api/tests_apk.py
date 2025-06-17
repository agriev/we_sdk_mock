import secrets
from os.path import join

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.reverse import reverse

from apps.apk.models import APK
from apps.utils.tests import APITestCase


class APKViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.url = reverse('api:apk_app')

    def setUp(self) -> None:
        self.filename = f'test.txt'
        self.file = _make_file(1000, self.filename, 'text/plain')

        self.version = '0.0.1'
        self.apk = APK.objects.create(version=self.version, app_file=self.file, active=True)

        for index in range(1, 10):
            APK.objects.create(version=self.version + f'.{index}', app_file=self.file)

    def test_get(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['version'], self.version)
        self.assertEqual(response.data['app_file'], join(settings.MEDIA_URL, self.apk.app_file.name))

    def test_invalid_methods(self):
        user = get_user_model().objects.create_user(username='user1', email='user@gmail.com', password='123')
        self.client.login(username=user.username, password='123')

        for method in ['post', 'patch', 'put', 'delete']:
            response = getattr(self.client, method)(self.url)
            self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


def _make_file(size, name, mime_type):
    file = SimpleUploadedFile(name=name, content=secrets.token_bytes(size), content_type=mime_type)
    file.seek(0)
    return file
