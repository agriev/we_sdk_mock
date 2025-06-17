import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.images.models


class Migration(migrations.Migration):
    replaces = [('images', '0001_squashed'), ('images', '0002_remove_userimage_image_source')]

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserImage',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to=apps.images.models.user_image)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User image',
                'verbose_name_plural': 'User images',
                'ordering': ('-id',),
            },
        ),
    ]
