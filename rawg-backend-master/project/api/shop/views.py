from django.db import transaction
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED, HTTP_400_BAD_REQUEST

from api.shop import paginations, serializers
from api.users import permissions
from api.views_mixins import GetObjectMixin, SlugLookupMixin
from apps.shop import models
from apps.token.models import Transaction
from apps.utils.tasks import send_email


class ProductViewSet(GetObjectMixin, SlugLookupMixin, viewsets.ReadOnlyModelViewSet):
    queryset = models.Product.objects.visible().prefetch_related('images')
    serializer_class = serializers.ProductSerializer
    pagination_class = paginations.ProductPagination

    def filter_queryset(self, queryset):
        user = self.request.user
        if user.is_authenticated:
            bought_products_ids = user.user_products.values_list('product_id', flat=True)
            queryset = queryset.exclude(id__in=bought_products_ids)
        for backend in list(self.filter_backends):
            queryset = backend().filter_queryset(self.request, queryset, self)
        return queryset


class ShopViewSet(viewsets.GenericViewSet):
    queryset = models.Product.objects.visible().prefetch_related('user_products')
    user_product_serializer = serializers.UserProductSerializer
    permission_classes = [permissions.IsUser, ]
    serializer_class = serializers.ProductSerializer

    def get_product(self, product_id):
        product = self.queryset.filter(pk=product_id).first()
        return product

    def buy_product(self, user_id, product_id, unique_code, price):
        user_product = models.UserProduct.objects.create(
            user_id=user_id, product_id=product_id, code=unique_code, price=price
        )
        return user_product

    def send_purchase_email(self, user, product, unique_code):
        context = {
            'user_name': user.username,
            'product_name': product.name,
            'product_pic': product.image or '',
            'product_url': product.link or '',
            'code': unique_code.code
        }
        send_email.delay('shop/email/product_bought', context, [user.email])
        return True

    @action(detail=False, methods=['POST', ], url_path='buy')
    def buy(self, request, *args, **kwargs):
        user = self.request.user
        password = self.request.data.get('password', None)
        product_id = self.request.data.get('product_id', None)
        if not password or not product_id:
            return Response({'error': 'Either of password or product_id not provided'},
                            status=HTTP_400_BAD_REQUEST)
        if not user.check_password(password):
            return Response({'error': 'The password provided is incorrect'},
                            status=HTTP_400_BAD_REQUEST)
        product = self.get_product(product_id)
        if not product:
            return Response({'error': 'Product with id %s does not exist' % product_id},
                            status=HTTP_400_BAD_REQUEST)
        unique_code = product.get_deactivate_code()
        if not unique_code:
            return Response({'error': 'Item out of stock'},
                            status=HTTP_400_BAD_REQUEST)
        already_bought = product.user_products.filter(user_id=user.id).exists()
        if already_bought:
            unique_code.activate_code()
            return Response({'error': 'User already bought this item'},
                            status=HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            bought = Transaction.shop_with_tokens(user, product.price)
            if not bought:
                unique_code.activate_code()
                return Response({'error': 'Insufficient tokens'},
                                status=HTTP_400_BAD_REQUEST)
            user_product = self.buy_product(user_id=user.id, product_id=product_id,
                                            unique_code=unique_code, price=product.price)
        self.send_purchase_email(user, product, unique_code)
        serializer = self.user_product_serializer(user_product)
        return Response(serializer.data, status=HTTP_201_CREATED)
