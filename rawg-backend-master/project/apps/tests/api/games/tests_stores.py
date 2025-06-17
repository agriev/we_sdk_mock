from django.test import TestCase

from . import GamesBaseTestCase


class StoresTestCase(GamesBaseTestCase, TestCase):
    def test_stores(self):
        self.assertEqual(self.client.get('/api/stores').status_code, 200)
