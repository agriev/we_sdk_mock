import django.contrib.postgres.fields.jsonb
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.utils.backend_storages
import apps.utils.models


class Migration(migrations.Migration):
    replaces = [('recommendations', '0001_initial'), ('recommendations', '0002_auto_20190411_1849'),
                ('recommendations', '0003_auto_20190417_2005'), ('recommendations', '0004_auto_20190419_1849')]

    initial = True

    dependencies = [
        ('games', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClassificationQueue',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('game',
                 models.OneToOneField(editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                      to='games.Game')),
            ],
            options={
                'verbose_name': 'Classification Queue',
                'verbose_name_plural': 'Classification Queue',
                'ordering': ('-id',),
            },
        ),
        migrations.CreateModel(
            name='ResultQueue',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('game',
                 models.OneToOneField(editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                      to='games.Game')),
            ],
            options={
                'verbose_name': 'Result Queue',
                'verbose_name_plural': 'Result Queue',
                'ordering': ('-id',),
            },
        ),
        migrations.CreateModel(
            name='Classification',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('image_420', models.FileField(blank=True, default=None, editable=False, null=True,
                                               storage=apps.utils.backend_storages.FileSystemStorage(),
                                               upload_to='recommendations/image_420/')),
                ('squeezenet', models.FileField(blank=True, default=None, editable=False, null=True,
                                                storage=apps.utils.backend_storages.FileSystemStorage(),
                                                upload_to='recommendations/squeezenet/')),
                ('googlenet_places', models.FileField(blank=True, default=None, editable=False, null=True,
                                                      storage=apps.utils.backend_storages.FileSystemStorage(),
                                                      upload_to='recommendations/googlenet_places/')),
                ('screenshot',
                 models.OneToOneField(editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                      to='games.ScreenShot')),
            ],
            options={
                'verbose_name': 'Classification',
                'verbose_name_plural': 'Classifications',
                'ordering': ('-id',),
            },
        ),
        migrations.CreateModel(
            name='NeighborQueue',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('network',
                 models.CharField(choices=[('squeezenet', 'Squeezenet'), ('googlenet_places', 'Googlenet Places')],
                                  db_index=True, editable=False, max_length=16)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('classification',
                 models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                   to='recommendations.Classification')),
            ],
            options={
                'verbose_name': 'Neighbor Queue',
                'verbose_name_plural': 'Neighbor Queue',
                'ordering': ('-id',),
                'unique_together': {('classification', 'network')},
            },
        ),
        migrations.CreateModel(
            name='Neighbor',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('network', models.CharField(db_index=True, editable=False, max_length=16)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('game', models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE,
                                           related_name='+', to='games.Game')),
                ('neighbors', django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True)),
            ],
            options={
                'verbose_name': 'Neighbor',
                'verbose_name_plural': 'Neighbors',
                'ordering': ('-id',),
                'unique_together': {('game', 'network')},
            },
        ),
        migrations.CreateModel(
            name='UserRecommendationQueue',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('datetime', models.DateTimeField(db_index=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Recommendation Queue',
                'verbose_name_plural': 'User Recommendation Queue',
                'db_table': 'users_userrecommendationqueue',
                'ordering': ('-id',),
            },
        ),
        migrations.CreateModel(
            name='UserRecommendation',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('hidden', models.BooleanField(db_index=True, default=False)),
                ('sources',
                 django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=10), default=list,
                                                           size=None)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True, db_index=True)),
                ('position', models.PositiveIntegerField(db_index=True)),
                ('game',
                 models.ForeignKey(db_index=False, on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Recommendation',
                'verbose_name_plural': 'User Recommendations',
                'db_table': 'users_userrecommendation',
                'ordering': ('position',),
                'unique_together': {('user', 'game')},
            },
            bases=(apps.utils.models.InitialValueMixin, models.Model),
        ),
    ]
