from django.conf import settings
from django.db import migrations, models

import apps.shop.models
import apps.utils.fields.autoslug
import apps.utils.models


class Migration(migrations.Migration):
    replaces = [('shop', '0001_initial'), ('shop', '0002_product_slug'), ('shop', '0003_auto_20180716_1507'),
                ('shop', '0004_auto_20180720_1332'), ('shop', '0005_auto_20180720_1618'),
                ('shop', '0006_auto_20180724_0839'), ('shop', '0007_auto_20180802_0748')]

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('slug', apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True))
            ],
            options={
                'verbose_name': 'Category',
                'verbose_name_plural': 'Categories',
            },
        ),
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(db_index=True, editable=False, verbose_name='order')),
                ('hidden', models.BooleanField(db_index=True, default=False)),
                ('name', models.CharField(max_length=100)),
                ('slug',
                 apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True)),
                ('price', models.PositiveIntegerField()),
                ('conditions', models.TextField(blank=True, default='')),
                ('description', models.TextField(blank=True, default='')),
                ('image', models.ImageField(blank=True, null=True, upload_to=apps.shop.models.product_image)),
                ('link', models.URLField(max_length=500)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('edited', models.DateTimeField(auto_now=True)),
                ('category',
                 models.ForeignKey(default=None, null=True, on_delete=models.deletion.CASCADE, related_name='products',
                                   to='shop.Category')),
            ],
            options={
                'verbose_name': 'Product',
                'verbose_name_plural': 'Products',
                'ordering': ('order',),
            },
            bases=(apps.utils.models.InitialValueMixin, models.Model),
        ),
        migrations.CreateModel(
            name='ProductCode',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=100)),
                ('active', models.BooleanField(default=True)),
                ('product', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='product_codes',
                                              to='shop.Product')),
            ],
            options={
                'verbose_name': 'Product code',
                'verbose_name_plural': 'Product codes',
            },
        ),
        migrations.CreateModel(
            name='ProductImage',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(blank=True, null=True, upload_to=apps.shop.models.product_image)),
                ('product',
                 models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='images', to='shop.Product')),
            ],
            options={
                'verbose_name': 'Product Image',
                'verbose_name_plural': 'Product Images',
            },
        ),
        migrations.CreateModel(
            name='UserProduct',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('price', models.DecimalField(decimal_places=10, max_digits=19)),
                ('code', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='used_code',
                                           to='shop.ProductCode')),
                ('product', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL,
                                              related_name='user_products', to='shop.Product')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='user_products',
                                           to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Product',
                'verbose_name_plural': 'User Products',
            },
        ),
        migrations.AlterUniqueTogether(
            name='userproduct',
            unique_together={('user', 'product')},
        ),
        migrations.AlterUniqueTogether(
            name='productcode',
            unique_together={('product', 'code')},
        ),
    ]
