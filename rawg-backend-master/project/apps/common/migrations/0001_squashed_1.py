import django.contrib.postgres.indexes
import django.db.models.deletion
from django.db import migrations, models

import apps.utils.models


class Migration(migrations.Migration):
    replaces = [('common', '0001_squashed'), ('common', '0002_auto_20190227_1257'),
                ('common', '0003_auto_20190305_1316'), ('common', '0004_randomscreenshotgame'),
                ('common', '0005_auto_20190329_1643'), ('common', '0006_seolink_seolinkcrawl_seolinkshow'),
                ('common', '0007_auto_20190503_1804'), ('common', '0008_auto_20190529_0852'),
                ('common', '0009_auto_20190529_2001')]

    initial = True

    dependencies = [
        ('games', '__first__'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='List',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(db_index=True, editable=False, verbose_name='order')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, default='')),
                ('content_type',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='contenttypes.ContentType')),
                ('title', models.CharField(blank=True, default='', max_length=200)),
            ],
            options={
                'verbose_name': 'List',
                'verbose_name_plural': 'Lists',
                'ordering': ('order',),
            },
        ),
        migrations.CreateModel(
            name='CatalogFilter',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('title', models.CharField(max_length=200)),
                ('genre', models.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                            on_delete=django.db.models.deletion.CASCADE, to='games.Genre')),
                ('platform', models.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                               on_delete=django.db.models.deletion.CASCADE, to='games.Platform')),
                ('year', models.PositiveSmallIntegerField(blank=True, default=None, null=True)),
                ('store', models.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                            on_delete=django.db.models.deletion.CASCADE, to='games.Store')),
                ('developer', models.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                                on_delete=django.db.models.deletion.CASCADE, to='games.Developer')),
                ('platformparent', models.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                                     on_delete=django.db.models.deletion.CASCADE,
                                                     to='games.PlatformParent')),
                ('publisher', models.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                                on_delete=django.db.models.deletion.CASCADE, to='games.Publisher')),
                ('tag', models.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                          on_delete=django.db.models.deletion.CASCADE, to='games.Tag')),
            ],
            options={
                'verbose_name': 'Catalog Filter',
                'verbose_name_plural': 'Catalog Filters',
                'unique_together': {('year', 'platform', 'platformparent', 'genre', 'store', 'tag',
                                     'developer', 'publisher')},
            },
        ),
        migrations.CreateModel(
            name='LatestGame',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now=True)),
                ('game',
                 models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
            ],
            options={
                'verbose_name': 'Latest Game',
                'verbose_name_plural': 'Latest Games',
            },
        ),
        migrations.AddIndex(
            model_name='latestgame',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['created'],
                                                            name='common_late_created_f73ab8_brin'),
        ),
        migrations.RemoveIndex(
            model_name='latestgame',
            name='common_late_created_f73ab8_brin',
        ),
        migrations.AlterField(
            model_name='latestgame',
            name='created',
            field=models.DateField(auto_now=True),
        ),
        migrations.AlterField(
            model_name='latestgame',
            name='created',
            field=models.DateField(auto_now_add=True),
        ),
        migrations.CreateModel(
            name='SeoLink',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('hidden', models.BooleanField(db_index=True, default=False)),
                ('uri', models.CharField(max_length=200)),
                ('name', models.CharField(max_length=200)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('shows_count', models.PositiveIntegerField(db_index=True, default=0, editable=False)),
                ('crawls_count', models.PositiveIntegerField(db_index=True, default=0, editable=False)),
                ('cycles_count', models.PositiveIntegerField(db_index=True, default=0, editable=False)),
            ],
            options={
                'verbose_name': 'SEO Link',
                'verbose_name_plural': 'SEO Links',
                'ordering': ('crawls_count', 'cycles_count', 'id'),
            },
            bases=(apps.utils.models.InitialValueMixin, models.Model),
        ),
        migrations.CreateModel(
            name='SeoLinkCrawl',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('uri', models.CharField(editable=False, max_length=200)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('ip', models.CharField(editable=False, max_length=15)),
                ('user_agent', models.CharField(editable=False, max_length=200)),
                ('seo_link', models.ForeignKey(blank=True, db_index=False, default=None, editable=False, null=True,
                                               on_delete=django.db.models.deletion.CASCADE, related_name='crawls',
                                               to='common.SeoLink')),
            ],
            options={
                'verbose_name': 'SEO Link Crawl',
                'verbose_name_plural': 'SEO Link Crawls',
            },
        ),
        migrations.CreateModel(
            name='SeoLinkShow',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('on_uri', models.CharField(editable=False, max_length=200)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('ip', models.CharField(editable=False, max_length=15)),
                ('user_agent', models.CharField(editable=False, max_length=200)),
                ('seo_link',
                 models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='shows',
                                   to='common.SeoLink')),
            ],
            options={
                'verbose_name': 'SEO Link Show',
                'verbose_name_plural': 'SEO Link Shows',
            },
        ),
        migrations.AlterUniqueTogether(
            name='catalogfilter',
            unique_together={
                ('year', 'platform', 'platformparent', 'genre', 'store', 'tag', 'developer', 'publisher')},
        ),
        migrations.CreateModel(
            name='RandomScreenShotGame',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Random Game',
                'verbose_name_plural': 'Random Games',
            },
        ),
        migrations.DeleteModel(
            name='LatestGame',
        ),
        migrations.DeleteModel(
            name='RandomScreenShotGame',
        ),
    ]
