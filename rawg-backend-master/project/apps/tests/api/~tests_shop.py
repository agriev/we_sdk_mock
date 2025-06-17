import os
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import Client, TestCase, tag
from rest_framework.authtoken.models import Token

from apps.shop.models import Product
from apps.token.models import Transaction


class ProductTestCase(TestCase):
    def setUp(self):
        email = os.environ.get('TEST_EMAIL', 'current@test.io')
        self.user = get_user_model().objects.get_or_create(username='current', email=email)[0]
        self.user.set_password('testpassword')
        self.user.save()
        self.token = Token.objects.get_or_create(user=self.user)[0].key
        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'}
        self.client = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = Client(**kwargs)
        super().setUp()

    def test_products(self):
        response = self.client.get('/api/shop/products')
        self.assertEqual(response.status_code, 200)

        product_1 = Product.objects.create(name='First', price=300, link='https://google.com')
        Product.objects.create(name='Second', price=200, link='https://amazon.com')
        Product.objects.create(name='Third', price=200, link='https://apple.com')

        product_1_code = product_1.product_codes.create(code='code1')
        product_1.user_products.create(user_id=self.user.id, code=product_1_code, price=product_1.price)

        response = self.client.get('/api/shop/products')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data['results']), 3)
        self.assertEqual(response_data['count'], 3)

        response = self.client_auth.get('/api/shop/products')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data['results']), 2)
        self.assertEqual(response_data['count'], 2)

    def test_product(self):
        product_1 = Product.objects.create(
            name='First', price=300, link='https://google.com', description='<b>wow!</b>',
            conditions='okay'
        )

        product_1_code = product_1.product_codes.create(code='code1')
        product_1.user_products.create(user_id=self.user.id, code=product_1_code, price=product_1.price)

        response = self.client.get('/api/shop/products/first')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['slug'], 'first')
        self.assertEqual(response_data['description'], '<b>wow!</b>')
        self.assertEqual(response_data['conditions'], 'okay')

        response = self.client_auth.get('/api/shop/products/first')
        self.assertEqual(response.status_code, 404)

    def test_buy_product(self):
        """
        Test for ShopViewSet.buy
        """
        product_1 = Product.objects.create(
            name='First', price=300, link='https://google.com', description='<b>wow!</b>',
            conditions='okay'
        )

        #  No product_id and password
        response = self.client_auth.post('/api/shop/buy', {})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Either of password or product_id not provided'})

        #  Incorrect password
        response = self.client_auth.post('/api/shop/buy', {
            'product_id': product_1.id,
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'The password provided is incorrect'})

        #  Product does not exist
        response = self.client_auth.post('/api/shop/buy', {
            'product_id': 0,
            'password': 'testpassword'
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Product with id 0 does not exist'})

        #  Product out of stock
        response = self.client_auth.post('/api/shop/buy', {
            'product_id': product_1.id,
            'password': 'testpassword'
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Item out of stock'})

        #  Product appears in stock
        product_1_code = product_1.product_codes.create(code='code1')

        #  Insufficient tokens
        response = self.client_auth.post('/api/shop/buy', {
            'product_id': product_1.id,
            'password': 'testpassword'
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Insufficient tokens'})

        #  User gets tokens
        self.user.transactions.create(
            user=self.user, count=700, operation=Transaction.OPERATION_IN, type=Transaction.TYPE_KARMA
        )

        #  Successful case
        response = self.client_auth.post('/api/shop/buy', {
            'product_id': product_1.id,
            'password': 'testpassword'
        })
        self.assertEqual(response.status_code, 201)
        response_data = response.data
        self.assertEqual(response_data['user_id'], self.user.id)
        self.assertEqual(response_data['code'], product_1_code.code)
        self.assertEqual(Decimal(response_data['price']), product_1.price)
        self.assertEqual(response_data['product_id'], product_1.id)

        #  Email sent
        self.assertIn(self.user.email, mail.outbox[0].recipients())

        #  One more product appears in stock
        product_1.product_codes.create(code='code2')

        #  Already bought
        response = self.client_auth.post('/api/shop/buy', {
            'product_id': product_1.id,
            'password': 'testpassword'
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'User already bought this item'})

    @tag('mail')
    def test_buy_product_mail(self):
        self.user.transactions.create(
            user=self.user, count=700, operation=Transaction.OPERATION_IN, type=Transaction.TYPE_KARMA
        )
        product = Product.objects.create(
            name='First', price=300, link='https://google.com', description='<b>wow!</b>',
            conditions='okay'
        )
        product.product_codes.create(code='code1')
        self.client_auth.post('/api/shop/buy', {
            'product_id': product.id,
            'password': 'testpassword'
        })
