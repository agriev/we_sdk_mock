import django.contrib.postgres.fields
import django.contrib.postgres.operations
import django.db.models.deletion
from django.db import migrations, models

import apps.credits.models
import apps.utils.fields.autoslug


class Migration(migrations.Migration):
    replaces = [('credits', '0001_squashed_1'), ('credits', '0002_remove_person_image_source'),
                ('credits', '0003_person_auto_description'), ('credits', '0004_person_updated')]

    initial = True

    dependencies = [
        ('games', '__first__'),
    ]

    operations = [
        django.contrib.postgres.operations.CITextExtension(
        ),
        migrations.CreateModel(
            name='Person',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name',
                 django.contrib.postgres.fields.citext.CICharField(editable=False, max_length=200, unique=True)),
                ('wikibase_id',
                 django.contrib.postgres.fields.citext.CICharField(blank=True, default=None, editable=False,
                                                                   max_length=50, null=True)),
                ('games_count', models.PositiveIntegerField(default=0, editable=False)),
                ('top_games',
                 django.contrib.postgres.fields.ArrayField(base_field=models.PositiveIntegerField(), default=list,
                                                           editable=False, size=None)),
                ('link', models.CharField(blank=True, default='', editable=False, max_length=200)),
                ('positions',
                 django.contrib.postgres.fields.ArrayField(base_field=models.PositiveIntegerField(), default=list,
                                                           editable=False, size=None)),
                ('rating', models.DecimalField(decimal_places=2, default=0, editable=False, max_digits=3)),
                ('rating_top', models.PositiveIntegerField(default=0, editable=False)),
                ('statistics', django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True)),
                ('reviews_count', models.PositiveIntegerField(default=0, editable=False)),
                ('slug',
                 apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True)),
                ('description', models.TextField(blank=True, default='')),
                ('image', models.FileField(blank=True, null=True, upload_to=apps.credits.models.person_image)),
                ('image_background', models.URLField(blank=True, editable=False, max_length=500, null=True)),
                ('on_main', models.BooleanField(db_index=True, default=False)),
                ('description_wiki', models.TextField(blank=True, default='', editable=False)),
                ('image_wiki', models.FileField(blank=True, editable=False, null=True,
                                                upload_to=apps.credits.models.person_image_wiki)),
                ('on_main_added', models.DateTimeField(blank=True, db_index=True, default=None, null=True)),
                ('hidden', models.BooleanField(db_index=True, default=False)),
                ('display_name', models.CharField(blank=True, default='', max_length=100)),
                ('merge_with', models.PositiveIntegerField(blank=True, default=None, null=True)),
                ('synonyms',
                 django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), default=list,
                                                           size=None)),
                ('games_added', models.PositiveIntegerField(default=0, editable=False)),
                ('auto_description', models.TextField(blank=True, default='')),
                ('updated', models.DateTimeField(blank=True, db_index=True, default=None, null=True)),
            ],
            options={
                'verbose_name_plural': 'Persons',
                'ordering': ('-games_added',),
                'verbose_name': 'Person',
            },
        ),
        migrations.CreateModel(
            name='Position',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(db_index=True, editable=False, verbose_name='order')),
                ('name', django.contrib.postgres.fields.citext.CICharField(max_length=200, unique=True)),
                ('wikibase_id',
                 django.contrib.postgres.fields.citext.CICharField(blank=True, default=None, max_length=50,
                                                                   null=True)),
                ('slug',
                 apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True)),
            ],
            options={
                'verbose_name_plural': 'Positions',
                'abstract': False,
                'ordering': ('order',),
                'verbose_name': 'Position',
            },
        ),
        migrations.CreateModel(
            name='GamePerson',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('person', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='credits.Person')),
                ('position', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='credits.Position')),
                ('hidden', models.BooleanField(db_index=True, default=False)),
            ],
            options={
                'verbose_name_plural': 'Game Persons',
                'ordering': ('position__order', 'person__name'),
                'verbose_name': 'Game Person',
                'unique_together': {('game', 'person', 'position')},
            },
        ),
    ]
