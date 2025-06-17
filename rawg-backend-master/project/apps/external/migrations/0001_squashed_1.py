import django.contrib.postgres.fields.jsonb
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    replaces = [('external', '0001_squashed'), ('external', '0002_auto_20190529_1206')]

    initial = True

    dependencies = [
        ('games', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='Youtube',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=500)),
                ('created', models.DateTimeField()),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('external_id', models.CharField(db_index=True, max_length=100)),
                ('channel_id', models.CharField(blank=True, default='', max_length=100)),
                ('channel_title', models.CharField(blank=True, default='', max_length=100)),
                ('comments_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('description', models.TextField(default='')),
                ('dislike_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('favorite_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('like_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('thumbnails', django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True)),
                ('view_count', models.PositiveIntegerField(db_index=True, default=0)),
            ],
            options={
                'ordering': ('-view_count',),
                'verbose_name_plural': 'Youtube',
                'verbose_name': 'Youtube',
                'unique_together': {('game', 'external_id')},
            },
        ),
        migrations.CreateModel(
            name='WikiData',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('wikidata', django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True)),
                ('infobox', django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('updated', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ('-id',),
                'verbose_name_plural': 'WikiData',
                'verbose_name': 'WikiData',
            },
        ),
        migrations.CreateModel(
            name='ImgurMain',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('external_id', models.CharField(db_index=True, max_length=100)),
                ('name', models.CharField(blank=True, default='', max_length=500)),
                ('description', models.TextField(default='')),
                ('created', models.DateTimeField()),
                ('image', models.URLField()),
                ('url', models.URLField()),
                ('is_gallery', models.BooleanField(default=None)),
                ('view_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('comments_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('data', django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True)),
                ('image_id', models.CharField(max_length=100)),
            ],
            options={
                'ordering': ('-view_count',),
                'verbose_name_plural': 'Imgur Main',
                'verbose_name': 'Imgur Main',
            },
        ),
        migrations.CreateModel(
            name='TwitchMain',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('external_id', models.BigIntegerField(db_index=True)),
                ('external_user_id', models.PositiveIntegerField(default=0)),
                ('name', models.CharField(max_length=500)),
                ('description', models.TextField(default='')),
                ('created', models.DateTimeField()),
                ('published', models.DateTimeField()),
                ('thumbnail', models.URLField(default='')),
                ('view_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('language', models.CharField(default='', max_length=3)),
                ('channel', models.CharField(default='', max_length=500)),
            ],
            options={
                'ordering': ('-view_count',),
                'verbose_name_plural': 'Twitch Main',
                'verbose_name': 'Twitch Main',
            },
        ),
        migrations.CreateModel(
            name='YoutubeMain',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('external_id', models.CharField(db_index=True, max_length=100)),
                ('channel_id', models.CharField(blank=True, default='', max_length=100)),
                ('channel_title', models.CharField(blank=True, default='', max_length=100)),
                ('name', models.CharField(max_length=500)),
                ('description', models.TextField(default='')),
                ('created', models.DateTimeField()),
                ('view_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('comments_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('like_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('dislike_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('favorite_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('thumbnails', django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True)),
                ('ordering', models.PositiveIntegerField(db_index=True, default=0)),
            ],
            options={
                'ordering': ('ordering',),
                'verbose_name_plural': 'Youtube Main',
                'verbose_name': 'Youtube Main',
            },
        ),
        migrations.CreateModel(
            name='Twitch',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=500)),
                ('created', models.DateTimeField()),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('external_id', models.BigIntegerField(db_index=True)),
                ('description', models.TextField(default='')),
                ('external_user_id', models.PositiveIntegerField(default=0)),
                ('language', models.CharField(default='', max_length=3)),
                ('published', models.DateTimeField()),
                ('thumbnail', models.URLField(default='')),
                ('view_count', models.PositiveIntegerField(db_index=True, default=0)),
            ],
            options={
                'ordering': ('-view_count',),
                'verbose_name_plural': 'Twitch',
                'verbose_name': 'Twitch',
                'unique_together': {('game', 'external_id')},
            },
        ),
        migrations.CreateModel(
            name='Imgur',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(blank=True, default='', max_length=500)),
                ('created', models.DateTimeField()),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('external_id', models.CharField(db_index=True, max_length=100)),
                ('comments_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('data', django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True)),
                ('description', models.TextField(default='')),
                ('image', models.URLField()),
                ('is_gallery', models.BooleanField(default=None)),
                ('url', models.URLField()),
                ('view_count', models.PositiveIntegerField(db_index=True, default=0)),
                ('image_id', models.CharField(max_length=100)),
            ],
            options={
                'ordering': ('-view_count',),
                'verbose_name_plural': 'Imgur',
                'verbose_name': 'Imgur',
                'unique_together': {('game', 'external_id')},
            },
        ),
        migrations.CreateModel(
            name='Reddit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('external_id', models.CharField(db_index=True, max_length=200)),
                ('name', models.CharField(max_length=500)),
                ('text', models.TextField()),
                ('image', models.URLField(blank=True, null=True)),
                ('raw_text', models.TextField()),
                ('url', models.URLField()),
                ('username', models.CharField(blank=True, default='', max_length=100)),
                ('username_url', models.URLField(blank=True, default='')),
                ('created', models.DateTimeField(db_index=True)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
            ],
            options={
                'ordering': ('-created',),
                'verbose_name_plural': 'Reddit',
                'verbose_name': 'Reddit',
                'unique_together': {('game', 'external_id')},
            },
        ),
        migrations.CreateModel(
            name='RedditMain',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('external_id', models.CharField(db_index=True, max_length=200)),
                ('name', models.CharField(max_length=500)),
                ('text', models.TextField()),
                ('image', models.URLField(blank=True, null=True)),
                ('raw_text', models.TextField()),
                ('url', models.URLField()),
                ('username', models.CharField(blank=True, default='', max_length=100)),
                ('username_url', models.URLField(blank=True, default='')),
                ('created', models.DateTimeField(db_index=True)),
            ],
            options={
                'ordering': ('-created',),
                'verbose_name_plural': 'Reddit Main',
                'verbose_name': 'Reddit Main',
            },
        ),
    ]
