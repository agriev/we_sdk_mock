import django.contrib.postgres.fields
import django.contrib.postgres.indexes
from django.conf import settings
from django.db import migrations, models

import apps.utils.fields.autoslug


class Migration(migrations.Migration):
    replaces = [('feed', '0001_squashed_1'), ('feed', '0002_userfeed_hidden'), ('feed', '0003_auto_20180628_0836')]

    initial = True

    dependencies = [
        ('reviews', '__first__'),
        ('contenttypes', '0002_remove_content_type_name'),
        ('users', '__first__'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Feed',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('data', django.contrib.postgres.fields.jsonb.JSONField()),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Feed',
                'verbose_name_plural': 'Feeds',
            },
        ),
        migrations.CreateModel(
            name='UserFeed',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(db_index=True)),
                ('feed', models.ForeignKey(on_delete=models.deletion.CASCADE, to='feed.Feed')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Feed',
                'verbose_name_plural': 'User Feeds',
                'ordering': ('-created', '-id'),
            },
        ),
        migrations.AddField(
            model_name='feed',
            name='action',
            field=models.CharField(choices=[('followed_user', 'Followed users'),
                                            ('followed_user_community', 'Followed users by community'),
                                            ('marked_game', 'Marked games'),
                                            ('marked_game_community', 'Marked games by community'),
                                            ('followed_collection', 'Followed collections'),
                                            ('created_collection', 'Created collections'),
                                            ('added_game_to_collection', 'Added games to a collection'),
                                            ('added_feed_to_collection', 'Added a feed to a collection'),
                                            ('suggested_game_to_collection', 'Suggested games to a collection'),
                                            ('added_review', 'Added a review to a game'),
                                            ('added_discussion', 'Added a discussion to a game'),
                                            ('added_comment', 'Added a new comment'),
                                            ('favorite_comment', 'Favorite a comment'), ('like', 'Like'),
                                            ('game_is_released', 'Game is released'),
                                            ('offer_change_playing', 'Offer to change a playing status'),
                                            ('offer_rate_game', 'Offer to rate a game'),
                                            ('popular_games', 'Popular games'),
                                            ('most_rated_games', 'Most rated games')], db_index=True,
                                   default='marked_game', max_length=30),
        ),
        migrations.AlterModelOptions(
            name='feed',
            options={'ordering': ('-created', '-id'), 'verbose_name': 'Feed', 'verbose_name_plural': 'Feeds'},
        ),
        migrations.AddIndex(
            model_name='feed',
            index=django.contrib.postgres.indexes.GinIndex(fields=['data'], name='feed_feed_data_fe4477_gin'),
        ),
        migrations.AddField(
            model_name='userfeed',
            name='new',
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AddField(
            model_name='userfeed',
            name='sources',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=10), default=list,
                                                            size=None),
        ),
        migrations.AlterField(
            model_name='feed',
            name='created',
            field=models.DateTimeField(db_index=True),
        ),
        migrations.AddField(
            model_name='feed',
            name='language',
            field=models.CharField(db_index=True, default='-', editable=False, max_length=3),
        ),
        migrations.CreateModel(
            name='FeedQueue',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('object_id', models.PositiveIntegerField()),
                ('action',
                 models.CharField(choices=[('a', 'Addition'), ('d', 'Deletion'), ('l', 'Language')], max_length=1)),
                ('data', django.contrib.postgres.fields.jsonb.JSONField(blank=True, default=None, null=True)),
                ('status', models.CharField(
                    choices=[('n', 'New'), ('s', 'Started'), ('f', 'Finished'), ('d', 'Delay'), ('e', 'Empty'),
                             ('x', 'Error')], db_index=True, default='n', max_length=1)),
                ('created', models.DateTimeField()),
                ('updated', models.DateTimeField(auto_now=True)),
                ('duration', models.PositiveIntegerField(default=0)),
                ('old', models.BooleanField(default=False)),
                ('content_type', models.ForeignKey(on_delete=models.deletion.CASCADE, to='contenttypes.ContentType')),
                ('execute', models.DateTimeField()),
                ('retries', models.PositiveIntegerField(default=0)),
            ],
            options={
                'verbose_name': 'Feed Queue',
                'verbose_name_plural': 'Feed Queue',
                'ordering': ('id',),
            },
        ),
        migrations.AddField(
            model_name='feed',
            name='queue',
            field=models.ForeignKey(default=None, null=True, on_delete=models.deletion.CASCADE, to='feed.FeedQueue'),
        ),
        migrations.AlterField(
            model_name='feed',
            name='user',
            field=models.ForeignKey(blank=True, default=None, null=True, on_delete=models.deletion.CASCADE,
                                    to=settings.AUTH_USER_MODEL),
        ),
        migrations.CreateModel(
            name='FeedElement',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('object_id', models.PositiveIntegerField()),
                ('action', models.CharField(choices=[('followed_user', 'Followed users'),
                                                     ('followed_user_community', 'Followed users by community'),
                                                     ('marked_game', 'Marked games'),
                                                     ('marked_game_community', 'Marked games by community'),
                                                     ('followed_collection', 'Followed collections'),
                                                     ('created_collection', 'Created collections'),
                                                     ('added_game_to_collection', 'Added games to a collection'),
                                                     ('added_feed_to_collection', 'Added a feed to a collection'), (
                                                     'suggested_game_to_collection',
                                                     'Suggested games to a collection'),
                                                     ('added_review', 'Added a review to a game'),
                                                     ('added_discussion', 'Added a discussion to a game'),
                                                     ('added_comment', 'Added a new comment'),
                                                     ('favorite_comment', 'Favorite a comment'), ('like', 'Like'),
                                                     ('game_is_released', 'Game is released'),
                                                     ('offer_change_playing', 'Offer to change a playing status'),
                                                     ('offer_rate_game', 'Offer to rate a game'),
                                                     ('popular_games', 'Popular games'),
                                                     ('most_rated_games', 'Most rated games')], max_length=30)),
                ('data', django.contrib.postgres.fields.jsonb.JSONField(blank=True, default=None, null=True)),
                ('created', models.DateTimeField()),
                ('content_type', models.ForeignKey(on_delete=models.deletion.CASCADE, to='contenttypes.ContentType')),
            ],
            options={
                'verbose_name': 'Feed Element',
                'verbose_name_plural': 'Feed Elements',
                'ordering': ('id',),
            },
        ),
        migrations.AlterUniqueTogether(
            name='feedelement',
            unique_together={('content_type', 'object_id', 'action')},
        ),
        migrations.AlterUniqueTogether(
            name='userfeed',
            unique_together={('user', 'feed')},
        ),
        migrations.CreateModel(
            name='Reaction',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(db_index=True, editable=False, verbose_name='order')),
                ('slug',
                 apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True)),
                ('name', models.CharField(max_length=100)),
            ],
            options={
                'verbose_name': 'Reaction',
                'verbose_name_plural': 'Reactions',
                'ordering': ('order',),
            },
        ),
        migrations.CreateModel(
            name='UserReaction',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'User Reaction',
                'verbose_name_plural': 'User Reactions',
                'ordering': ('-id',),
            },
        ),
        migrations.AddField(
            model_name='feed',
            name='reactions',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='userreaction',
            name='feed',
            field=models.ForeignKey(on_delete=models.deletion.CASCADE, to='feed.Feed'),
        ),
        migrations.AddField(
            model_name='userreaction',
            name='reaction',
            field=models.ForeignKey(on_delete=models.deletion.CASCADE, to='feed.Reaction'),
        ),
        migrations.AddField(
            model_name='userreaction',
            name='user',
            field=models.ForeignKey(blank=True, default=None, null=True, on_delete=models.deletion.CASCADE,
                                    to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterUniqueTogether(
            name='userreaction',
            unique_together={('user', 'feed', 'reaction')},
        ),
        migrations.CreateModel(
            name='UserNotifyFeed',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(db_index=True)),
                ('new', models.BooleanField(db_index=True, default=True)),
                ('feed', models.ForeignKey(on_delete=models.deletion.CASCADE, to='feed.Feed')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Notify Feed',
                'verbose_name_plural': 'User Notify Feeds',
                'ordering': ('-created', '-id'),
            },
        ),
        migrations.AlterUniqueTogether(
            name='usernotifyfeed',
            unique_together={('user', 'feed')},
        ),
        migrations.AlterField(
            model_name='userfeed',
            name='user',
            field=models.ForeignKey(default=None, null=True, on_delete=models.deletion.CASCADE,
                                    to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='userfeed',
            name='hidden',
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
