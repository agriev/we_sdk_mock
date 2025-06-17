from django.conf import settings
from django.db import models

from apps.utils.fields.autoslug import CIAutoSlugField
from apps.utils.models import OrderedHiddenModel
from apps.utils.upload import upload_to


def product_image(instance, filename):
    return upload_to('products', instance, filename, False)


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = CIAutoSlugField(populate_from='name', unique=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'


class Product(OrderedHiddenModel):
    name = models.CharField(max_length=100)
    slug = CIAutoSlugField(populate_from='name', unique=True)
    price = models.PositiveIntegerField()
    conditions = models.TextField(blank=True, default='')
    description = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to=product_image, blank=True, null=True)
    link = models.URLField(max_length=500)
    created = models.DateTimeField(auto_now_add=True)
    edited = models.DateTimeField(auto_now=True)
    category = models.ForeignKey(Category, models.CASCADE, related_name='products', default=None, null=True)

    def get_deactivate_code(self):
        code = self.product_codes.filter(active=True).first()
        if code:
            code = code.deactivate_code()
            return code
        return None

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ('order',)


class ProductImage(models.Model):
    product = models.ForeignKey(Product, models.CASCADE, related_name='images')
    image = models.ImageField(upload_to=product_image, blank=True, null=True)

    def __str__(self):
        return str(self.image)

    class Meta:
        verbose_name = 'Product Image'
        verbose_name_plural = 'Product Images'


class ProductCode(models.Model):
    product = models.ForeignKey(Product, models.CASCADE, related_name='product_codes')
    code = models.CharField(max_length=100)
    active = models.BooleanField(default=True)

    def activate_code(self):
        if not self.active:
            self.active = True
            self.save(update_fields=['active', ])
        return self

    def deactivate_code(self):
        if self.active:
            self.active = False
            self.save(update_fields=['active', ])
        return self

    def __str__(self):
        return self.code

    class Meta:
        verbose_name = 'Product code'
        verbose_name_plural = 'Product codes'
        unique_together = ('product', 'code')


class UserProduct(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='user_products')
    product = models.ForeignKey(Product, models.SET_NULL, blank=True, null=True, related_name='user_products')
    created = models.DateTimeField(auto_now_add=True)
    code = models.ForeignKey(ProductCode, models.CASCADE, related_name='used_code')
    price = models.DecimalField(max_digits=19, decimal_places=10)

    def __str__(self):
        return str(self.pk)

    class Meta:
        verbose_name = 'User Product'
        verbose_name_plural = 'User Products'
        unique_together = ('user', 'product')
