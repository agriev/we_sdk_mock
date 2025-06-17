import datetime

import django.contrib.postgres.fields
import django.contrib.postgres.indexes
import django.contrib.postgres.operations
import django.utils.timezone
import select2.fields
from django.conf import settings
from django.db import migrations, models
from django.utils.timezone import utc

import apps.games.models
import apps.utils.fields.autoslug
import apps.utils.models


class Migration(migrations.Migration):
    replaces = [('games', '0001_squashed_2'), ('games', '0002_auto_20181206_1353'),
                ('games', '0002_auto_20181206_0903'), ('games', '0003_merge_20181207_1311'),
                ('games', '0004_gameplatform_tba'), ('games', '0005_auto_20181219_1239'),
                ('games', '0006_auto_20181227_1133'), ('games', '0007_auto_20190111_0928'),
                ('games', '0008_auto_20190111_1715'), ('games', '0009_auto_20190114_1039'),
                ('games', '0010_auto_20190114_2045'), ('games', '0011_store_use_in_sync'),
                ('games', '0012_auto_20190124_1120'), ('games', '0013_auto_20190125_2051'),
                ('games', '0014_auto_20190128_0848'), ('games', '0015_auto_20190218_1135'),
                ('games', '0016_auto_20190219_1104'), ('games', '0017_auto_20190219_1423'),
                ('games', '0018_game_events_count'), ('games', '0019_auto_20190219_1643'),
                ('games', '0020_auto_20190305_1959'), ('games', '0021_remove_movie_preview_source'),
                ('games', '0022_auto_20190315_1141'), ('games', '0023_game_added_by_status'),
                ('games', '0024_auto_20190402_1220'), ('games', '0025_auto_20190402_1747'),
                ('games', '0026_auto_20190426_2040'), ('games', '0026_auto_20190426_1220'),
                ('games', '0027_merge_20190429_1549'), ('games', '0028_auto_20190520_1029'),
                ('games', '0029_auto_20190524_0933'), ('games', '0030_auto_20190528_1922'),
                ('games', '0031_auto_20190529_0852')]

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        django.contrib.postgres.operations.CITextExtension(
        ),
        django.contrib.postgres.operations.BtreeGinExtension(
        ),
        migrations.CreateModel(
            name='Publisher',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('synonyms',
                 django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), default=[],
                                                           size=None)),
            ],
            options={
                'ordering': ('name',),
            },
        ),
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('synonyms',
                 django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), default=[],
                                                           size=None)),
            ],
            options={
                'ordering': ('name',),
            },
        ),
        migrations.CreateModel(
            name='Developer',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('synonyms',
                 django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), default=[],
                                                           size=None)),
            ],
            options={
                'ordering': ('name',),
            },
        ),
        migrations.CreateModel(
            name='Genre',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('synonyms',
                 django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), default=[],
                                                           size=None)),
            ],
            options={
                'ordering': ('name',),
            },
        ),
        migrations.CreateModel(
            name='Platform',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('slug', apps.utils.fields.autoslug.CIAutoSlugField(default=None, editable=False, null=True,
                                                                    populate_from='name', unique=True)),
            ],
            options={
                'ordering': ('name',),
            },
        ),
        migrations.CreateModel(
            name='Game',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=500)),
                ('description', models.TextField()),
                ('metacritic', models.FloatField(blank=True, null=True)),
                ('publishers', models.ManyToManyField(to='games.Publisher')),
                ('categories', models.ManyToManyField(to='games.Category')),
                ('developers', models.ManyToManyField(to='games.Developer')),
                ('genres', models.ManyToManyField(to='games.Genre')),
            ],
        ),
        migrations.CreateModel(
            name='GamePlatform',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('requirements', django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('platform', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Platform')),
                ('released_at', models.DateField(blank=True, null=True)),
            ],
        ),
        migrations.AddField(
            model_name='game',
            name='platforms',
            field=models.ManyToManyField(blank=True, through='games.GamePlatform', to='games.Platform'),
        ),
        migrations.CreateModel(
            name='ScreenShot',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('source', models.URLField(max_length=500)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='screenshots',
                                           to='games.Game')),
                ('image', models.ImageField(blank=True, null=True, upload_to=apps.games.models.screenshot_image)),
                ('is_small', models.BooleanField(default=False)),
            ],
            options={
                'ordering': ('id',),
            },
        ),
        migrations.CreateModel(
            name='Tag',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('synonyms',
                 django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), default=[],
                                                           size=None)),
            ],
            options={
                'ordering': ('name',),
            },
        ),
        migrations.AddField(
            model_name='game',
            name='tags',
            field=models.ManyToManyField(blank=True, to='games.Tag'),
        ),
        migrations.AlterField(
            model_name='game',
            name='metacritic',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to=apps.games.models.game_image),
        ),
        migrations.CreateModel(
            name='Collection',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=250)),
                ('creator', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE,
                                              to=settings.AUTH_USER_MODEL)),
                ('description', models.TextField(default='')),
                ('created', models.DateTimeField(auto_now_add=True,
                                                 default=datetime.datetime(2017, 2, 13, 14, 35, 5, 943413,
                                                                           tzinfo=utc))),
            ],
        ),
        migrations.AddField(
            model_name='game',
            name='image_background',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='dominant_color',
            field=models.CharField(default='0f0f0f', max_length=6),
        ),
        migrations.CreateModel(
            name='CollectionGame',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('added', models.DateTimeField(auto_now_add=True)),
                ('collection', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Collection')),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
            ],
            options={
                'ordering': ('-added', 'game__name'),
            },
        ),
        migrations.AddField(
            model_name='collection',
            name='games',
            field=models.ManyToManyField(through='games.CollectionGame', to='games.Game'),
        ),
        migrations.AlterField(
            model_name='collection',
            name='creator',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE,
                                    related_name='collections', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='game',
            name='released',
            field=models.DateField(blank=True, db_index=True, null=True),
        ),
        migrations.CreateModel(
            name='CollectionOffer',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('added', models.DateTimeField(auto_now_add=True)),
                ('hidden', models.BooleanField(default=False)),
                ('collection', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Collection')),
                ('creator', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE,
                                              related_name='offers', to=settings.AUTH_USER_MODEL)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
            ],
            options={
                'ordering': ('-added', 'game__name'),
            },
        ),
        migrations.AddField(
            model_name='collection',
            name='offers',
            field=models.ManyToManyField(related_name='collections_offers', through='games.CollectionOffer',
                                         to='games.Game'),
        ),
        migrations.AlterModelOptions(
            name='collection',
            options={'ordering': ('-created',)},
        ),
        migrations.CreateModel(
            name='Featured',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(db_index=True, editable=False, verbose_name='order')),
                ('game',
                 select2.fields.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='featured',
                                           to='games.Game')),
            ],
            options={
                'ordering': ('order',),
                'verbose_name_plural': 'Featured Games',
                'verbose_name': 'Featured Game',
            },
        ),
        migrations.AlterField(
            model_name='collection',
            name='name',
            field=models.CharField(max_length=100),
        ),
        migrations.AddField(
            model_name='collection',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(default=None, editable=False, null=True,
                                                             populate_from='name', unique=True),
        ),
        migrations.AddField(
            model_name='game',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(default=None, editable=False, null=True,
                                                             populate_from='name', unique=True),
        ),
        migrations.CreateModel(
            name='Store',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug',
                 apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True)),
                ('name', models.CharField(max_length=100)),
                ('platforms', models.ManyToManyField(to='games.Platform')),
            ],
        ),
        migrations.CreateModel(
            name='GameStore',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url', models.URLField(max_length=500)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('store', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Store')),
                ('store_internal_id', models.CharField(blank=True, db_index=True, max_length=50)),
            ],
        ),
        migrations.AddField(
            model_name='game',
            name='stores',
            field=models.ManyToManyField(blank=True, through='games.GameStore', to='games.Store'),
        ),
        migrations.AddField(
            model_name='game',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), default=[],
                                                            size=None),
        ),
        migrations.AlterField(
            model_name='game',
            name='name',
            field=models.CharField(max_length=200),
        ),
        migrations.AlterField(
            model_name='game',
            name='categories',
            field=models.ManyToManyField(blank=True, to='games.Category'),
        ),
        migrations.AlterField(
            model_name='game',
            name='developers',
            field=models.ManyToManyField(blank=True, to='games.Developer'),
        ),
        migrations.AlterField(
            model_name='game',
            name='publishers',
            field=models.ManyToManyField(blank=True, to='games.Publisher'),
        ),
        migrations.AddField(
            model_name='collection',
            name='game_background',
            field=models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE,
                                    related_name='+', to='games.Game'),
        ),
        migrations.AlterField(
            model_name='game',
            name='metacritic',
            field=models.IntegerField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='required_age',
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name='game',
            name='website',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='collection',
            name='on_main',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='collection',
            name='on_main_added',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='collection',
            name='backgrounds',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True),
        ),
        migrations.AlterModelOptions(
            name='game',
            options={'ordering': ('-released', '-metacritic')},
        ),
        migrations.AlterField(
            model_name='collection',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='game',
            name='categories',
            field=select2.fields.ManyToManyField(blank=True, sorted=False, to='games.Category'),
        ),
        migrations.AlterField(
            model_name='game',
            name='developers',
            field=select2.fields.ManyToManyField(blank=True, sorted=False, to='games.Developer'),
        ),
        migrations.AlterField(
            model_name='game',
            name='genres',
            field=select2.fields.ManyToManyField(sorted=False, to='games.Genre'),
        ),
        migrations.AlterField(
            model_name='game',
            name='publishers',
            field=select2.fields.ManyToManyField(blank=True, sorted=False, to='games.Publisher'),
        ),
        migrations.AlterField(
            model_name='game',
            name='tags',
            field=select2.fields.ManyToManyField(blank=True, sorted=False, to='games.Tag'),
        ),
        migrations.AddIndex(
            model_name='developer',
            index=django.contrib.postgres.indexes.GinIndex(fields=['synonyms'], name='games_devel_synonym_80173c_gin'),
        ),
        migrations.AddIndex(
            model_name='genre',
            index=django.contrib.postgres.indexes.GinIndex(fields=['synonyms'], name='games_genre_synonym_fa8644_gin'),
        ),
        migrations.AddIndex(
            model_name='publisher',
            index=django.contrib.postgres.indexes.GinIndex(fields=['synonyms'], name='games_publi_synonym_e2d35c_gin'),
        ),
        migrations.AddIndex(
            model_name='category',
            index=django.contrib.postgres.indexes.GinIndex(fields=['synonyms'], name='games_categ_synonym_0e6086_gin'),
        ),
        migrations.AddIndex(
            model_name='game',
            index=django.contrib.postgres.indexes.GinIndex(fields=['synonyms'], name='games_game_synonym_ad9725_gin'),
        ),
        migrations.AddIndex(
            model_name='tag',
            index=django.contrib.postgres.indexes.GinIndex(fields=['synonyms'], name='games_tag_synonym_d508b0_gin'),
        ),
        migrations.AddField(
            model_name='category',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(default=None, editable=False, null=True,
                                                             populate_from='name', unique=True),
        ),
        migrations.AddField(
            model_name='developer',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(default=None, editable=False, null=True,
                                                             populate_from='name', unique=True),
        ),
        migrations.AddField(
            model_name='genre',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(default=None, editable=False, null=True,
                                                             populate_from='name', unique=True),
        ),
        migrations.AddField(
            model_name='publisher',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(default=None, editable=False, null=True,
                                                             populate_from='name', unique=True),
        ),
        migrations.AddField(
            model_name='tag',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(default=None, editable=False, null=True,
                                                             populate_from='name', unique=True),
        ),
        migrations.AlterModelOptions(
            name='category',
            options={'ordering': ('name',), 'verbose_name': 'Category', 'verbose_name_plural': 'Categories'},
        ),
        migrations.AlterModelOptions(
            name='collection',
            options={'ordering': ('-created',), 'verbose_name': 'Collection', 'verbose_name_plural': 'Collections'},
        ),
        migrations.AlterModelOptions(
            name='collectiongame',
            options={'ordering': ('-added', 'game__name'), 'verbose_name': 'Collection Game',
                     'verbose_name_plural': 'Collection Games'},
        ),
        migrations.AlterModelOptions(
            name='collectionoffer',
            options={'ordering': ('-added', 'game__name'), 'verbose_name': 'Collection Offer',
                     'verbose_name_plural': 'Collection Offers'},
        ),
        migrations.AlterModelOptions(
            name='developer',
            options={'ordering': ('name',), 'verbose_name': 'Developer', 'verbose_name_plural': 'Developers'},
        ),
        migrations.AlterModelOptions(
            name='game',
            options={'ordering': ('-released', '-metacritic'), 'verbose_name': 'Game', 'verbose_name_plural': 'Games'},
        ),
        migrations.AlterModelOptions(
            name='gameplatform',
            options={'verbose_name': 'Game Platform', 'verbose_name_plural': 'Game Platforms'},
        ),
        migrations.AlterModelOptions(
            name='gamestore',
            options={'verbose_name': 'Game Store', 'verbose_name_plural': 'Game Stores'},
        ),
        migrations.AlterModelOptions(
            name='genre',
            options={'ordering': ('name',), 'verbose_name': 'Genre', 'verbose_name_plural': 'Genres'},
        ),
        migrations.AlterModelOptions(
            name='platform',
            options={'ordering': ('order',), 'verbose_name': 'Platform', 'verbose_name_plural': 'Platforms'},
        ),
        migrations.AlterModelOptions(
            name='publisher',
            options={'ordering': ('name',), 'verbose_name': 'Publisher', 'verbose_name_plural': 'Publishers'},
        ),
        migrations.AlterModelOptions(
            name='screenshot',
            options={'ordering': ('id',), 'verbose_name': 'Screenshot', 'verbose_name_plural': 'Screenshots'},
        ),
        migrations.AlterModelOptions(
            name='store',
            options={'ordering': ('order',), 'verbose_name': 'Store', 'verbose_name_plural': 'Stores'},
        ),
        migrations.AlterModelOptions(
            name='tag',
            options={'ordering': ('name',), 'verbose_name': 'Tag', 'verbose_name_plural': 'Tags'},
        ),
        migrations.AddField(
            model_name='category',
            name='merge_with',
            field=models.PositiveIntegerField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='developer',
            name='merge_with',
            field=models.PositiveIntegerField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='genre',
            name='merge_with',
            field=models.PositiveIntegerField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='publisher',
            name='merge_with',
            field=models.PositiveIntegerField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='tag',
            name='merge_with',
            field=models.PositiveIntegerField(blank=True, default=None, null=True),
        ),
        migrations.AlterField(
            model_name='collection',
            name='created',
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        migrations.AlterField(
            model_name='collectiongame',
            name='added',
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        migrations.AlterField(
            model_name='collectionoffer',
            name='added',
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        migrations.AddField(
            model_name='game',
            name='saturated_color',
            field=models.CharField(default='0f0f0f', max_length=6),
        ),
        migrations.AddField(
            model_name='category',
            name='hidden',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='category',
            name='order',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False, verbose_name='order'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='developer',
            name='hidden',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='developer',
            name='order',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False, verbose_name='order'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='genre',
            name='hidden',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='genre',
            name='order',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False, verbose_name='order'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='publisher',
            name='hidden',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='publisher',
            name='order',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False, verbose_name='order'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='tag',
            name='hidden',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='tag',
            name='order',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False, verbose_name='order'),
            preserve_default=False,
        ),
        migrations.AlterModelOptions(
            name='category',
            options={'ordering': ('order',), 'verbose_name': 'Category', 'verbose_name_plural': 'Categories'},
        ),
        migrations.AlterModelOptions(
            name='developer',
            options={'ordering': ('order',), 'verbose_name': 'Developer', 'verbose_name_plural': 'Developers'},
        ),
        migrations.AlterModelOptions(
            name='genre',
            options={'ordering': ('order',), 'verbose_name': 'Genre', 'verbose_name_plural': 'Genres'},
        ),
        migrations.AlterModelOptions(
            name='publisher',
            options={'ordering': ('order',), 'verbose_name': 'Publisher', 'verbose_name_plural': 'Publishers'},
        ),
        migrations.AlterModelOptions(
            name='tag',
            options={'ordering': ('order',), 'verbose_name': 'Tag', 'verbose_name_plural': 'Tags'},
        ),
        migrations.AlterField(
            model_name='category',
            name='hidden',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AlterField(
            model_name='developer',
            name='hidden',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AlterField(
            model_name='genre',
            name='hidden',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AlterField(
            model_name='publisher',
            name='hidden',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AlterField(
            model_name='tag',
            name='hidden',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AlterModelOptions(
            name='game',
            options={'ordering': ('-id',), 'verbose_name': 'Game', 'verbose_name_plural': 'Games'},
        ),
        migrations.AlterField(
            model_name='game',
            name='metacritic',
            field=models.IntegerField(db_index=True, default=0),
        ),
        migrations.AlterField(
            model_name='game',
            name='released',
            field=models.DateField(db_index=True, default=datetime.datetime(1900, 1, 1, 0, 0)),
        ),
        migrations.AlterField(
            model_name='game',
            name='released',
            field=models.DateField(db_index=True, default=datetime.date(1900, 1, 1)),
        ),
        migrations.AlterField(
            model_name='game',
            name='image',
            field=models.FileField(blank=True, null=True, upload_to=apps.games.models.game_image),
        ),
        migrations.AlterField(
            model_name='screenshot',
            name='image',
            field=models.FileField(blank=True, null=True, upload_to=apps.games.models.screenshot_image),
        ),
        migrations.AlterField(
            model_name='game',
            name='required_age',
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='game',
            name='website',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='platform',
            name='order',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False, verbose_name='order'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='store',
            name='order',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False, verbose_name='order'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='game',
            name='description_is_plain_text',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='screenshot',
            name='is_external',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='category',
            name='added',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='developer',
            name='added',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='genre',
            name='added',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='publisher',
            name='added',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='tag',
            name='added',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='genre',
            name='hidden',
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AlterField(
            model_name='category',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), default=list,
                                                            size=None),
        ),
        migrations.AlterField(
            model_name='developer',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), default=list,
                                                            size=None),
        ),
        migrations.AlterField(
            model_name='game',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), default=list,
                                                            size=None),
        ),
        migrations.AlterField(
            model_name='genre',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), default=list,
                                                            size=None),
        ),
        migrations.AlterField(
            model_name='publisher',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), default=list,
                                                            size=None),
        ),
        migrations.AlterField(
            model_name='tag',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), default=list,
                                                            size=None),
        ),
        migrations.AddField(
            model_name='game',
            name='rating',
            field=models.DecimalField(decimal_places=2, default=0, editable=False, max_digits=3),
        ),
        migrations.AddField(
            model_name='game',
            name='ratings',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='reactions',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AlterUniqueTogether(
            name='gameplatform',
            unique_together={('game', 'platform')},
        ),
        migrations.AlterUniqueTogether(
            name='collectiongame',
            unique_together={('collection', 'game')},
        ),
        migrations.AlterField(
            model_name='collectionoffer',
            name='hidden',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AlterUniqueTogether(
            name='collectionoffer',
            unique_together={('collection', 'game')},
        ),
        migrations.AddField(
            model_name='game',
            name='added',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='rating_top',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='charts',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='collection',
            name='language',
            field=models.CharField(db_index=True, default='', editable=False, max_length=3),
        ),
        migrations.AddField(
            model_name='collection',
            name='language_detection',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AlterField(
            model_name='collection',
            name='backgrounds',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.CreateModel(
            name='PlatformParent',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(db_index=True, editable=False, verbose_name='order')),
                ('slug',
                 apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True)),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, default='')),
            ],
            options={
                'ordering': ('order',),
                'verbose_name_plural': 'Parent platforms',
                'verbose_name': 'Parent platform',
            },
        ),
        migrations.AddField(
            model_name='platform',
            name='parent',
            field=models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                    to='games.PlatformParent'),
        ),
        migrations.CreateModel(
            name='Movie',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('internal_id', models.CharField(blank=True, db_index=True, max_length=50)),
                ('name', models.CharField(max_length=200)),
                ('preview', models.FileField(blank=True, null=True, upload_to=apps.games.models.movie_image)),
                ('data', django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='movies',
                                           to='games.Game')),
                ('store', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Store')),
                ('preview_source', models.URLField(blank=True, editable=False, max_length=500)),
            ],
            options={
                'ordering': ('-id',),
                'verbose_name_plural': 'Movies',
                'verbose_name': 'Movie',
            },
        ),
        migrations.AddField(
            model_name='game',
            name='discussions_count',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False),
        ),
        migrations.AlterField(
            model_name='gamestore',
            name='store_internal_id',
            field=models.CharField(blank=True, db_index=True, max_length=100),
        ),
        migrations.AddField(
            model_name='collection',
            name='likes_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='collection',
            name='likes_fake',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='collection',
            name='likes_positive',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False),
        ),
        migrations.AddField(
            model_name='collection',
            name='likes_rating',
            field=models.IntegerField(db_index=True, default=0, editable=False),
        ),
        migrations.AddField(
            model_name='collection',
            name='games_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.CreateModel(
            name='CollectionLike',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('positive', models.BooleanField(db_index=True, default=True)),
                ('added', models.DateTimeField(auto_now_add=True)),
                ('collection', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='likes',
                                                 to='games.Collection')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Collection Likes',
                'verbose_name': 'Collection Like',
                'unique_together': {('user', 'collection')},
            },
        ),
        migrations.AddField(
            model_name='collection',
            name='posts_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='collection',
            name='followers_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='reddit_description',
            field=models.TextField(default='', editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='reddit_logo',
            field=models.URLField(default='', editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='reddit_name',
            field=models.CharField(default='', editable=False, max_length=200),
        ),
        migrations.AddField(
            model_name='game',
            name='reddit_url',
            field=models.CharField(blank=True, default='',
                                   help_text='For example "https://www.reddit.com/r/uncharted/" or "uncharted"',
                                   max_length=200),
        ),
        migrations.AddField(
            model_name='game',
            name='twitch_id',
            field=models.PositiveIntegerField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='twitch_name',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='game',
            name='twitch_not_found',
            field=models.BooleanField(default=False, editable=False),
        ),
        migrations.AlterField(
            model_name='game',
            name='name',
            field=models.CharField(max_length=200, unique=True),
        ),
        migrations.AddField(
            model_name='game',
            name='image_background_additional',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='playtime',
            field=models.PositiveIntegerField(default=0, editable=False, help_text='in hours'),
        ),
        migrations.AddField(
            model_name='game',
            name='youtube_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AlterField(
            model_name='category',
            name='name',
            field=django.contrib.postgres.fields.citext.CICharField(max_length=100, unique=True),
        ),
        migrations.AlterField(
            model_name='developer',
            name='name',
            field=django.contrib.postgres.fields.citext.CICharField(max_length=100, unique=True),
        ),
        migrations.AlterField(
            model_name='game',
            name='name',
            field=django.contrib.postgres.fields.citext.CICharField(max_length=200, unique=True),
        ),
        migrations.AlterField(
            model_name='genre',
            name='name',
            field=django.contrib.postgres.fields.citext.CICharField(max_length=100, unique=True),
        ),
        migrations.AlterField(
            model_name='publisher',
            name='name',
            field=django.contrib.postgres.fields.citext.CICharField(max_length=100, unique=True),
        ),
        migrations.AlterField(
            model_name='tag',
            name='name',
            field=django.contrib.postgres.fields.citext.CICharField(max_length=100, unique=True),
        ),
        migrations.AddField(
            model_name='game',
            name='wikibase_id',
            field=django.contrib.postgres.fields.citext.CICharField(blank=True, default=None, editable=False,
                                                                    max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='wikipedia_name',
            field=django.contrib.postgres.fields.citext.CICharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='game',
            name='wikipedia_not_found',
            field=models.BooleanField(default=False, editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='is_complicated_name',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='game',
            name='users',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='achievements_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='collections_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='imgur_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='movies_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='reddit_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='screenshots_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='twitch_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AlterField(
            model_name='collection',
            name='on_main',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AlterField(
            model_name='collection',
            name='on_main_added',
            field=models.DateTimeField(blank=True, db_index=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='collection',
            name='updated',
            field=models.DateTimeField(default=None, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='youtube_name',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='game',
            name='imgur_name',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AlterField(
            model_name='game',
            name='description',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='collection',
            name='description',
            field=models.TextField(blank=True, default='', max_length=512),
        ),
        migrations.AlterField(
            model_name='gamestore',
            name='store_internal_id',
            field=models.CharField(blank=True, db_index=True, max_length=150),
        ),
        migrations.AlterUniqueTogether(
            name='gamestore',
            unique_together={('game', 'store')},
        ),
        migrations.AddField(
            model_name='game',
            name='import_collection',
            field=django.contrib.postgres.fields.citext.CICharField(default=None, max_length=20, null=True),
        ),
        migrations.AlterField(
            model_name='game',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(default='', editable=False, populate_from='name',
                                                             unique=True),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='screenshot',
            name='source',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.CreateModel(
            name='CollectionFeed',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('object_id', models.PositiveIntegerField()),
                ('created', models.DateTimeField(db_index=True)),
                ('text', models.TextField(blank=True)),
                ('text_safe', models.TextField(blank=True, editable=False)),
                ('text_bare', models.TextField(blank=True, editable=False)),
                ('text_preview', models.TextField(blank=True, editable=False)),
                ('text_previews',
                 django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True)),
                ('text_attachments', models.PositiveIntegerField(default=0, editable=False)),
                ('comments_count', models.PositiveIntegerField(default=0, editable=False)),
                ('comments_last',
                 django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True)),
                ('collection', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Collection')),
                ('content_type',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='contenttypes.ContentType')),
                ('language', models.CharField(db_index=True, default='', editable=False, max_length=3)),
                ('language_detection', models.PositiveIntegerField(default=0, editable=False)),
                ('user',
                 models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE,
                                   to=settings.AUTH_USER_MODEL)),
                ('comments_parent_count', models.PositiveIntegerField(default=0, editable=False)),
            ],
            options={
                'ordering': ('-created',),
                'verbose_name_plural': 'Collection Feeds',
                'verbose_name': 'Collection Feed',
                'unique_together': {('collection', 'content_type', 'object_id')},
            },
        ),
        migrations.AlterModelOptions(
            name='game',
            options={'ordering': ('-id',), 'permissions': (('merge_games', 'Can merge games'),),
                     'verbose_name': 'Game', 'verbose_name_plural': 'Games'},
        ),
        migrations.AddField(
            model_name='game',
            name='promo',
            field=django.contrib.postgres.fields.citext.CICharField(blank=True, default='', max_length=20),
        ),
        migrations.AlterField(
            model_name='game',
            name='import_collection',
            field=django.contrib.postgres.fields.citext.CICharField(blank=True, default='', max_length=20),
        ),
        migrations.AddField(
            model_name='collection',
            name='promo',
            field=django.contrib.postgres.fields.citext.CICharField(blank=True, default='', max_length=20),
        ),
        migrations.CreateModel(
            name='PromoFeatured',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(db_index=True, editable=False, verbose_name='order')),
                ('game',
                 select2.fields.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='promo_featured',
                                           to='games.Game')),
            ],
            options={
                'verbose_name': 'Promo Featured Game',
                'verbose_name_plural': 'Promo Featured Games',
                'ordering': ('order',),
            },
        ),
        migrations.AddField(
            model_name='game',
            name='ratings_count',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='reviews_text_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='tba',
            field=models.BooleanField(default=False, verbose_name='TBA'),
        ),
        migrations.AddField(
            model_name='game',
            name='parent_achievements_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AlterField(
            model_name='category',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True),
        ),
        migrations.AlterField(
            model_name='collection',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True),
        ),
        migrations.AlterField(
            model_name='developer',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True),
        ),
        migrations.AlterField(
            model_name='genre',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True),
        ),
        migrations.AlterField(
            model_name='platform',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True),
        ),
        migrations.AlterField(
            model_name='publisher',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True),
        ),
        migrations.AlterField(
            model_name='tag',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True),
        ),
        migrations.AddField(
            model_name='game',
            name='metacritic_url',
            field=models.CharField(
                blank=True, default='',
                help_text='For example "http://www.metacritic.com/game/playstation-4/the-witcher-3-wild-hunt"',
                max_length=200
            ),
        ),
        migrations.AlterField(
            model_name='game',
            name='metacritic',
            field=models.IntegerField(db_index=True, default=0, editable=False),
        ),
        migrations.CreateModel(
            name='GamePlatformMetacritic',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('metascore', models.IntegerField(db_index=True, default=0, editable=False)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('platform', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Platform')),
            ],
            options={
                'verbose_name': 'Game Platform Metacritic',
                'verbose_name_plural': 'Game Platforms Metacritic',
                'unique_together': {('game', 'platform')},
            },
        ),
        migrations.CreateModel(
            name='ESRBRating',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(db_index=True, editable=False, verbose_name='order')),
                ('hidden', models.BooleanField(db_index=True, default=False)),
                ('slug',
                 apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True)),
                ('name', models.CharField(max_length=100)),
                ('short_name', models.CharField(max_length=20)),
                ('description', models.CharField(max_length=1000)),
            ],
            options={
                'verbose_name': 'ESRB Rating',
                'verbose_name_plural': 'ESRB Ratings',
                'ordering': ('order',),
                'abstract': False,
            },
            bases=(apps.utils.models.InitialValueMixin, models.Model),
        ),
        migrations.AddField(
            model_name='game',
            name='esrb_rating',
            field=models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE,
                                    to='games.ESRBRating'),
        ),
        migrations.AddField(
            model_name='game',
            name='is_free',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='screenshot',
            name='image_alternate',
            field=models.FileField(blank=True, null=True, upload_to=apps.games.models.screenshot_image),
        ),
        migrations.AddField(
            model_name='game',
            name='alternative_names',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True,
                                                                 verbose_name='Public alternative names'),
        ),
        migrations.CreateModel(
            name='LinkedStuff',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('link_type',
                 models.CharField(choices=[('DLC', 'DLC'), ('Edition', 'Edition')], default='', max_length=20)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('parent_game',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='parent_game',
                                   to='games.Game')),
            ],
            options={
                'verbose_name': 'Linked Stuff',
                'verbose_name_plural': 'Linked Stuffs',
                'ordering': ('-id',),
                'unique_together': {('game', 'parent_game')},
            },
        ),
        migrations.AlterModelOptions(
            name='screenshot',
            options={'ordering': ('order', 'is_small', '-is_external', 'id'), 'verbose_name': 'Screenshot',
                     'verbose_name_plural': 'Screenshots'},
        ),
        migrations.AddField(
            model_name='screenshot',
            name='hidden',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name='screenshot',
            name='order',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='persons_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='store',
            name='domain',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.RemoveField(
            model_name='game',
            name='required_age',
        ),
        migrations.AddField(
            model_name='game',
            name='description_is_protected',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='category',
            name='games_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='category',
            name='image_background',
            field=models.URLField(blank=True, editable=False, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='category',
            name='top_games',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.PositiveIntegerField(), default=list,
                                                            editable=False, size=None),
        ),
        migrations.AddField(
            model_name='developer',
            name='games_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='developer',
            name='image_background',
            field=models.URLField(blank=True, editable=False, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='developer',
            name='top_games',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.PositiveIntegerField(), default=list,
                                                            editable=False, size=None),
        ),
        migrations.AddField(
            model_name='genre',
            name='games_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='genre',
            name='image_background',
            field=models.URLField(blank=True, editable=False, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='genre',
            name='top_games',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.PositiveIntegerField(), default=list,
                                                            editable=False, size=None),
        ),
        migrations.AddField(
            model_name='platform',
            name='games_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='platform',
            name='image',
            field=models.FileField(blank=True, null=True, upload_to=apps.games.models.platform_image),
        ),
        migrations.AddField(
            model_name='platform',
            name='image_background',
            field=models.URLField(blank=True, editable=False, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='platform',
            name='top_games',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.PositiveIntegerField(), default=list,
                                                            editable=False, size=None),
        ),
        migrations.AddField(
            model_name='publisher',
            name='games_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='publisher',
            name='image_background',
            field=models.URLField(blank=True, editable=False, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='publisher',
            name='top_games',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.PositiveIntegerField(), default=list,
                                                            editable=False, size=None),
        ),
        migrations.AddField(
            model_name='tag',
            name='games_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='tag',
            name='image_background',
            field=models.URLField(blank=True, editable=False, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='tag',
            name='top_games',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.PositiveIntegerField(), default=list,
                                                            editable=False, size=None),
        ),
        migrations.AddField(
            model_name='category',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='developer',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='genre',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='platform',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='publisher',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='tag',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.CreateModel(
            name='GamePicked',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('game', select2.fields.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('hidden', models.BooleanField(db_index=True, default=False)),
                ('placed', models.DateTimeField(default=None, null=True)),
                ('removed', models.DateTimeField(default=None, null=True)),
            ],
            options={
                'verbose_name': 'Picked Game',
                'verbose_name_plural': 'Picked Games',
            },
        ),
        migrations.AddField(
            model_name='platform',
            name='image_background_custom',
            field=models.FileField(blank=True, null=True, upload_to=apps.games.models.platform_image_background),
        ),
        migrations.AddField(
            model_name='platform',
            name='year_end',
            field=models.PositiveSmallIntegerField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='platform',
            name='year_start',
            field=models.PositiveSmallIntegerField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='category',
            name='games_added',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='developer',
            name='games_added',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='genre',
            name='games_added',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='platform',
            name='games_added',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='publisher',
            name='games_added',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='tag',
            name='games_added',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='screenshot',
            name='created',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='ScreenShotCount',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('game', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('queued', models.DateTimeField(null=True)),
            ],
            options={
                'verbose_name': 'Screenshot score',
                'verbose_name_plural': 'Screenshots score',
                'ordering': ('-id',),
            },
        ),
        migrations.AddField(
            model_name='store',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='game',
            name='rating',
            field=models.DecimalField(db_index=True, decimal_places=2, default=0, editable=False, max_digits=3),
        ),
        migrations.AddField(
            model_name='game',
            name='weighted_rating',
            field=models.DecimalField(db_index=True, decimal_places=2, default=0, editable=False, max_digits=3),
        ),
        migrations.AddField(
            model_name='game',
            name='display_external',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='gameplatform',
            name='tba',
            field=models.BooleanField(default=False, verbose_name='TBA'),
        ),
        migrations.AddField(
            model_name='game',
            name='categories_json',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='developers_json',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='esrb_rating_json',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='genres_json',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='parent_platforms_json',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='platforms_json',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='publishers_json',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='stores_json',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='tags_json',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.RemoveIndex(
            model_name='game',
            name='games_game_synonym_ad9725_gin',
        ),
        migrations.AddField(
            model_name='game',
            name='created',
            field=models.DateTimeField(default=None, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='updated',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddIndex(
            model_name='game',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['created'], name='games_game_created_4028d2_brin'),
        ),
        migrations.AddIndex(
            model_name='game',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['updated'], name='games_game_updated_088a29_brin'),
        ),
        migrations.AddField(
            model_name='game',
            name='suggestions',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='suggestions_count',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False),
        ),
        migrations.AlterField(
            model_name='game',
            name='updated',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AlterField(
            model_name='game',
            name='updated',
            field=models.DateTimeField(default=None),
        ),
        migrations.RemoveIndex(
            model_name='game',
            name='games_game_updated_088a29_brin',
        ),
        migrations.AlterField(
            model_name='game',
            name='updated',
            field=models.DateTimeField(db_index=True, default=None),
        ),
        migrations.AddField(
            model_name='store',
            name='use_in_sync',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='game',
            name='rating_avg',
            field=models.DecimalField(decimal_places=2, default=0, editable=False, max_digits=3),
        ),
        migrations.AddIndex(
            model_name='game',
            index=models.Index(fields=['-added', '-id'], name='games_game_added_9880fb_idx'),
        ),
        migrations.AddIndex(
            model_name='game',
            index=models.Index(fields=['-released', '-id'], name='games_game_release_2c1ca4_idx'),
        ),
        migrations.AddIndex(
            model_name='game',
            index=models.Index(fields=['-rating', '-id'], name='games_game_rating_796718_idx'),
        ),
        migrations.RemoveField(
            model_name='game',
            name='dominant_color',
        ),
        migrations.RemoveField(
            model_name='game',
            name='saturated_color',
        ),
        migrations.AddIndex(
            model_name='game',
            index=models.Index(fields=['-weighted_rating', '-id'], name='games_game_weighte_7bf627_idx'),
        ),
        migrations.CreateModel(
            name='GameFeedEvent',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(db_index=True, editable=False, verbose_name='order')),
                ('created', models.DateTimeField(default=None, null=True)),
                ('action', models.CharField(choices=[('add', 'Add'), ('update', 'Update'), ('delete', 'Delete')],
                                            max_length=32)),
                ('event_type', models.CharField(choices=[('screenshot', 'Screenshot'), ('description', 'Description'),
                                                         ('release_date', 'Release Date'), ('genres', 'Genres'),
                                                         ('tags', 'Tags'), ('categories', 'Categories'),
                                                         ('developers', 'Developers'), ('publishers', 'Publishers'),
                                                         ('posts', 'Posts'), ('comments', 'Comments'),
                                                         ('stores', 'Stores'), ('website', 'Website'),
                                                         ('collections', 'Collections'), ('youtube', 'Youtube'),
                                                         ('twitch', 'Twitch')], max_length=32)),
                ('object_id', models.PositiveIntegerField(null=True)),
                ('data', django.contrib.postgres.fields.jsonb.JSONField(blank=True, default=None, null=True)),
                ('content_type',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='contenttypes.ContentType')),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
            ],
            options={
                'verbose_name': 'Game Feed Event',
                'verbose_name_plural': 'Game Feed Events',
                'ordering': ('order',),
            },
        ),
        migrations.AddIndex(
            model_name='gamefeedevent',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['created'],
                                                            name='games_gamef_created_13ef58_brin'),
        ),
        migrations.AlterModelOptions(
            name='gamefeedevent',
            options={'verbose_name': 'Game Feed Event', 'verbose_name_plural': 'Game Feed Events'},
        ),
        migrations.RemoveField(
            model_name='gamefeedevent',
            name='order',
        ),
        migrations.AddField(
            model_name='game',
            name='events_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AlterField(
            model_name='gamefeedevent',
            name='event_type',
            field=models.CharField(choices=[('screenshot', 'Screenshot'), ('description', 'Description'),
                                            ('release_date', 'Release Date'), ('genres', 'Genres'), ('tags', 'Tags'),
                                            ('platforms', 'Platforms'), ('categories', 'Categories'),
                                            ('developers', 'Developers'), ('publishers', 'Publishers'),
                                            ('posts', 'Posts'), ('comments', 'Comments'), ('stores', 'Stores'),
                                            ('website', 'Website'), ('collections', 'Collections'),
                                            ('youtube', 'Youtube'), ('twitch', 'Twitch')], max_length=32),
        ),
        migrations.AddField(
            model_name='game',
            name='clip_json',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='screenshots_json',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.RemoveField(
            model_name='movie',
            name='preview_source',
        ),
        migrations.AlterField(
            model_name='game',
            name='created',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='added_by_status',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='comments_last',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='comments_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='game',
            name='comments_parent_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='store',
            name='games_added',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='store',
            name='games_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='store',
            name='image_background',
            field=models.URLField(blank=True, editable=False, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='store',
            name='top_games',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.PositiveIntegerField(), default=list,
                                                            editable=False, size=None),
        ),
        migrations.AddField(
            model_name='game',
            name='game_seo_fields_json',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='last_modified_json',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddIndex(
            model_name='game',
            index=models.Index(fields=['tba'], name='games_game_tba_84ff88_idx'),
        ),
        migrations.RemoveIndex(
            model_name='game',
            name='games_game_tba_84ff88_idx',
        ),
        migrations.AddField(
            model_name='tag',
            name='white',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AlterField(
            model_name='game',
            name='tba',
            field=models.BooleanField(db_index=True, default=False, verbose_name='TBA'),
        ),
        migrations.RemoveField(
            model_name='game',
            name='categories',
        ),
        migrations.RemoveField(
            model_name='game',
            name='categories_json',
        ),
        migrations.AlterField(
            model_name='gamefeedevent',
            name='event_type',
            field=models.CharField(choices=[('screenshot', 'Screenshot'), ('description', 'Description'),
                                            ('release_date', 'Release Date'), ('genres', 'Genres'), ('tags', 'Tags'),
                                            ('platforms', 'Platforms'), ('developers', 'Developers'),
                                            ('publishers', 'Publishers'), ('posts', 'Posts'), ('comments', 'Comments'),
                                            ('stores', 'Stores'), ('website', 'Website'),
                                            ('collections', 'Collections'), ('youtube', 'Youtube'),
                                            ('twitch', 'Twitch')], max_length=32),
        ),
        migrations.DeleteModel(
            name='Category',
        ),
    ]
