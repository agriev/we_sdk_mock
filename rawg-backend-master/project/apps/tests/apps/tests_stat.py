from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse


class ViewsTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        user = get_user_model().objects.create(username='test', email='test@test.io', is_staff=True)
        self.client.force_login(user)
        super().setUp()

    def test_users_registrations(self):
        get = self.client.get(reverse('stat:users_registrations'))
        self.assertEqual(get.status_code, 200)

    def test_users_visits(self):
        get = self.client.get(reverse('stat:users_visits'))
        self.assertEqual(get.status_code, 200)

    def user_retention_week(self):
        get = self.client.get(reverse('stat:users_retention_week'))
        self.assertEqual(get.status_code, 200)

    def user_retention_month(self):
        get = self.client.get(reverse('stat:users_retention_month'))
        self.assertEqual(get.status_code, 200)

    def test_users_online(self):
        get = self.client.get(reverse('stat:users_online'))
        self.assertEqual(get.status_code, 200)

    def test_users_activity(self):
        get = self.client.get(reverse('stat:users_activity'))
        self.assertEqual(get.status_code, 200)

    def test_data_statuses(self):
        get = self.client.get(reverse('stat:data_statuses'))
        self.assertEqual(get.status_code, 200)

    def test_data_collections(self):
        get = self.client.get(reverse('stat:data_collections'))
        self.assertEqual(get.status_code, 200)

    def test_data_reviews(self):
        get = self.client.get(reverse('stat:data_reviews'))
        self.assertEqual(get.status_code, 200)

    def test_data_comments(self):
        get = self.client.get(reverse('stat:data_comments'))
        self.assertEqual(get.status_code, 200)

    def test_data_followings(self):
        get = self.client.get(reverse('stat:data_followings'))
        self.assertEqual(get.status_code, 200)

    def test_data_games(self):
        get = self.client.get(reverse('stat:data_games'))
        self.assertEqual(get.status_code, 200)

    def test_games_statuses(self):
        get = self.client.get(reverse('stat:games_statuses'))
        self.assertEqual(get.status_code, 200)

    def test_games_revisions(self):
        get = self.client.get(reverse('stat:games_revisions'))
        self.assertEqual(get.status_code, 200)

    def test_recommendations_totals(self):
        get = self.client.get(reverse('stat:recommendations_totals'))
        self.assertEqual(get.status_code, 200)

    def test_api_user_agent(self):
        get = self.client.get(reverse('stat:api_user_agent'))
        self.assertEqual(get.status_code, 200)

    def test_api_ip(self):
        get = self.client.get(reverse('stat:api_ip'))
        self.assertEqual(get.status_code, 200)

    def test_api_ip_and_user_agent(self):
        get = self.client.get(reverse('stat:api_ip_and_user_agent'))
        self.assertEqual(get.status_code, 200)

    def test_api_user(self):
        get = self.client.get(reverse('stat:api_user'))
        self.assertEqual(get.status_code, 200)
