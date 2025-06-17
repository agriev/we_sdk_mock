from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from django.core import mail

from apps.feedback.models import Feedback
from apps.utils.tests import APITestCase


class ViewsTestCase(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='andy', email='andy@test.io', password='123')
        self.client.login(username=self.user.username, password='123')
        Site.objects.get_or_create(domain='api.ag.ru', defaults={'name': 'ag.ru'})
        super().setUp()

    def tearDown(self):
        Site.objects.get(domain='api.ag.ru').delete()
        super().tearDown()

    def test_post(self):
        mail.outbox = []
        self.client.logout()
        post = self.client.post('/api/feedback', {
            'email': 'test@test.io',
            'name': 'nick',
            'text': 'hello, it\'s the bad seeds!',
        }, HTTP_HOST='api.ag.ru')
        self.assertEqual(post.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)

    def test_post_auth(self):
        mail.outbox = []
        post = self.client.post('/api/feedback', {
            'email': 'andy@test.io',
            'name': 'andy',
            'text': 'hello, i am alive',
        }, HTTP_HOST='api.ag.ru')
        self.assertEqual(post.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(Feedback.objects.order_by('-id').first().user_id, self.user.id)
