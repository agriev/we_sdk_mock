import django.contrib.postgres.fields.jsonb
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.stories.models
import apps.utils.fields.autoslug


class Migration(migrations.Migration):
    replaces = [('stories', '0001_squashed_1'), ('stories', '0002_auto_20190603_0852')]

    initial = True

    dependencies = [
        ('games', '__first__'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Story',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('slug',
                 apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True)),
                ('background', models.URLField(blank=True, default='', editable=False, max_length=500, null=True)),
                ('hidden', models.BooleanField(db_index=True, default=True)),
                ('order', models.PositiveIntegerField(db_index=True, editable=False, verbose_name='order')),
                ('is_ready', models.BooleanField(default=False, editable=False)),
                ('first',
                 django.contrib.postgres.fields.jsonb.JSONField(blank=True, default=None, editable=False, null=True)),
                ('custom_background',
                 models.ImageField(blank=True, null=True, upload_to=apps.stories.models.story_image)),
                ('use_for_partners', models.BooleanField(db_index=True, default=True)),
                ('name_ru', models.CharField(blank=True, default='', max_length=100)),
            ],
            options={
                'verbose_name': 'Story',
                'verbose_name_plural': 'Stories',
                'ordering': ('order',),
            },
        ),
        migrations.CreateModel(
            name='Video',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('game',
                 models.ForeignKey(blank=True, db_index=False, null=True, on_delete=django.db.models.deletion.CASCADE,
                                   to='games.Game')),
                ('video', models.FileField(blank=True, null=True, upload_to=apps.stories.models.original_video)),
                ('youtube_id', models.CharField(max_length=100)),
            ],
            options={
                'verbose_name': 'Video',
                'verbose_name_plural': 'Videos',
                'unique_together': {('youtube_id', 'game')},
            },
        ),
        migrations.CreateModel(
            name='Clip',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('game',
                 models.ForeignKey(blank=True, db_index=False, null=True, on_delete=django.db.models.deletion.CASCADE,
                                   to='games.Game')),
                ('video',
                 models.ForeignKey(blank=True, db_index=False, null=True, on_delete=django.db.models.deletion.CASCADE,
                                   to='stories.Video')),
                ('clip', models.FileField(blank=True, null=True, upload_to=apps.stories.models.story_clip)),
                ('second', models.PositiveIntegerField(default=0)),
                ('preview', models.FileField(blank=True, null=True, upload_to=apps.stories.models.story_preview)),
                ('clip_320', models.FileField(blank=True, null=True, upload_to=apps.stories.models.story_clip_320)),
                ('clip_640', models.FileField(blank=True, null=True, upload_to=apps.stories.models.story_clip_640)),
            ],
            options={
                'verbose_name': 'Clip',
                'verbose_name_plural': 'Clips',
                'unique_together': {('video', 'second', 'game')},
            },
        ),
        migrations.CreateModel(
            name='GameStory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('clip', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE,
                                           to='stories.Clip')),
                ('game',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+', to='games.Game')),
                ('story', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='game_stories',
                                            to='stories.Story')),
                ('youtube_link', models.URLField(blank=True, default='')),
                ('order', models.PositiveIntegerField(db_index=True)),
                ('hidden', models.BooleanField(db_index=True, default=False)),
                ('is_error', models.BooleanField(default=False)),
            ],
            options={
                'verbose_name': 'Game Story',
                'verbose_name_plural': 'Game Stories',
                'ordering': ('order',),
            },
        ),
        migrations.CreateModel(
            name='UserStory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('story', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='stories.Story')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Story',
                'verbose_name_plural': 'User Stories',
                'unique_together': {('user', 'story')},
            },
        ),
        migrations.CreateModel(
            name='UserGameStory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('game_story', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='stories.GameStory')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Game Story',
                'verbose_name_plural': 'User Game Stories',
                'unique_together': {('user', 'game_story')},
            },
        ),
    ]
