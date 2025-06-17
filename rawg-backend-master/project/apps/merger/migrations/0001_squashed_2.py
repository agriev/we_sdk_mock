import django.contrib.postgres.operations
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.utils.fields.autoslug


class Migration(migrations.Migration):
    replaces = [('merger', '0001_squashed_1'), ('merger', '0002_auto_20190302_1133')]

    initial = True

    dependencies = [
        ('games', '__first__'),
        ('contenttypes', '0002_remove_content_type_name'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('users', '__first__'),
    ]

    operations = [
        django.contrib.postgres.operations.CITextExtension(
        ),
        migrations.CreateModel(
            name='StoreAdd',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('store_add',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+', to='games.Store')),
                ('stores_was', models.ManyToManyField(related_name='_storeadd_stores_was_+', to='games.Store')),
            ],
            options={
                'verbose_name': 'Add Store',
                'verbose_name_plural': 'Add Stores',
            },
        ),
        migrations.CreateModel(
            name='Network',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=250)),
                ('slug',
                 apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True)),
            ],
            options={
                'verbose_name': 'Network',
                'verbose_name_plural': 'Networks',
            },
        ),
        migrations.CreateModel(
            name='Import',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateTimeField(db_index=True)),
                ('is_sync', models.BooleanField(default=True)),
                ('is_old', models.BooleanField(default=False)),
                ('is_manual', models.BooleanField(default=True)),
                ('retries', models.PositiveIntegerField(default=0)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                           to=settings.AUTH_USER_MODEL)),
                ('is_started', models.BooleanField(default=False)),
                ('is_fast', models.IntegerField(default=0, help_text='In days')),
            ],
            options={
                'verbose_name': 'Import',
                'ordering': ('id',),
                'verbose_name_plural': 'Imports',
            },
        ),
        migrations.CreateModel(
            name='SimilarGame',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('is_ignored', models.BooleanField(default=False)),
                ('first_game',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+', to='games.Game')),
                ('second_game',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+', to='games.Game')),
                ('selected_game', models.PositiveIntegerField(default=None, null=True)),
            ],
            options={
                'unique_together': {('first_game', 'second_game')},
                'verbose_name': 'Similar Game',
                'verbose_name_plural': 'Similar Games',
            },
        ),
        migrations.CreateModel(
            name='ImportLog',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('account', models.CharField(max_length=200)),
                ('status', models.CharField(max_length=50)),
                ('date', models.DateTimeField(db_index=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                           to=settings.AUTH_USER_MODEL)),
                ('network', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='merger.Network')),
                ('is_sync', models.BooleanField(default=False)),
                ('is_sync_old', models.BooleanField(default=False)),
                ('duration', models.PositiveIntegerField(default=0)),
            ],
            options={
                'ordering': ('-date',),
                'verbose_name': 'Import log',
                'verbose_name_plural': 'Import logs',
            },
        ),
        migrations.CreateModel(
            name='MergedSlug',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('old_slug', models.SlugField()),
                ('new_slug', models.SlugField()),
                ('content_type',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='contenttypes.ContentType')),
            ],
            options={
                'verbose_name': 'Merged slug',
                'verbose_name_plural': 'Merged slugs',
                'unique_together': {('old_slug', 'new_slug', 'content_type')},
            },
        ),
        migrations.CreateModel(
            name='DeletedGame',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('game_name', models.CharField(max_length=200)),
            ],
            options={
                'verbose_name': 'Deleted Game',
                'verbose_name_plural': 'Deleted Games',
            },
        ),
    ]
