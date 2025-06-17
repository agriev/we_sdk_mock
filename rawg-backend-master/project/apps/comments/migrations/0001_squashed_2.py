import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    replaces = [('comments', '0001_squashed_1'), ('comments', '0002_auto_20190402_1108')]

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('discussions', '__first__'),
        ('reviews', '__first__'),
        ('games', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='CommentReview',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField()),
                ('created', models.DateTimeField(db_index=True)),
                ('edited', models.DateTimeField()),
                ('likes_count', models.PositiveIntegerField(db_index=True, default=0, editable=False)),
                ('comments_count', models.PositiveIntegerField(default=0, editable=False)),
                ('object', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments',
                                             to='reviews.Review')),
                ('parent',
                 models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE,
                                   related_name='children', to='comments.CommentReview')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('language', models.CharField(db_index=True, default='', editable=False, max_length=3)),
                ('language_detection', models.PositiveIntegerField(default=0, editable=False)),
                ('posts_count', models.PositiveIntegerField(default=0, editable=False)),
            ],
            options={
                'ordering': ('-created',),
                'verbose_name_plural': 'Comments (Review)',
                'verbose_name': 'Comment (Review)',
            },
        ),
        migrations.CreateModel(
            name='LikeReview',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('added', models.DateTimeField()),
                ('comment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='likes',
                                              to='comments.CommentReview')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Likes (Review)',
                'verbose_name': 'Like (Review)',
                'unique_together': {('user', 'comment')},
            },
        ),
        migrations.CreateModel(
            name='CommentDiscussion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('language', models.CharField(db_index=True, default='', editable=False, max_length=3)),
                ('language_detection', models.PositiveIntegerField(default=0, editable=False)),
                ('text', models.TextField()),
                ('created', models.DateTimeField(db_index=True)),
                ('edited', models.DateTimeField()),
                ('likes_count', models.PositiveIntegerField(db_index=True, default=0, editable=False)),
                ('comments_count', models.PositiveIntegerField(default=0, editable=False)),
                ('object', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments',
                                             to='discussions.Discussion')),
                ('parent',
                 models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE,
                                   related_name='children', to='comments.CommentDiscussion')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('posts_count', models.PositiveIntegerField(default=0, editable=False)),
            ],
            options={
                'ordering': ('-created',),
                'verbose_name_plural': 'Comments (Discussion)',
                'verbose_name': 'Comment (Discussion)',
            },
        ),
        migrations.CreateModel(
            name='LikeDiscussion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('added', models.DateTimeField()),
                ('comment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='likes',
                                              to='comments.CommentDiscussion')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Likes (Discussion)',
                'verbose_name': 'Like (Discussion)',
                'unique_together': {('user', 'comment')},
            },
        ),
        migrations.CreateModel(
            name='CommentCollectionFeed',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('language', models.CharField(db_index=True, default='', editable=False, max_length=3)),
                ('language_detection', models.PositiveIntegerField(default=0, editable=False)),
                ('text', models.TextField()),
                ('created', models.DateTimeField(db_index=True)),
                ('edited', models.DateTimeField()),
                ('likes_count', models.PositiveIntegerField(db_index=True, default=0, editable=False)),
                ('comments_count', models.PositiveIntegerField(default=0, editable=False)),
                ('object', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments',
                                             to='games.CollectionFeed')),
                ('parent',
                 models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE,
                                   related_name='children', to='comments.CommentCollectionFeed')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('posts_count', models.PositiveIntegerField(default=0, editable=False)),
            ],
            options={
                'ordering': ('-created',),
                'verbose_name_plural': 'Comments (Collection Feed)',
                'verbose_name': 'Comment (Collection Feed)',
            },
        ),
        migrations.CreateModel(
            name='LikeCollectionFeed',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('added', models.DateTimeField()),
                ('comment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='likes',
                                              to='comments.CommentCollectionFeed')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Likes (Collection Feed)',
                'verbose_name': 'Like (Collection Feed)',
                'unique_together': {('user', 'comment')},
            },
        ),
        migrations.CreateModel(
            name='CommentGame',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('language', models.CharField(db_index=True, default='', editable=False, max_length=3)),
                ('language_detection', models.PositiveIntegerField(default=0, editable=False)),
                ('text', models.TextField()),
                ('created', models.DateTimeField(db_index=True)),
                ('edited', models.DateTimeField()),
                ('likes_count', models.PositiveIntegerField(db_index=True, default=0, editable=False)),
                ('comments_count', models.PositiveIntegerField(default=0, editable=False)),
                ('posts_count', models.PositiveIntegerField(default=0, editable=False)),
                ('object', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments',
                                             to='games.Game')),
                ('parent',
                 models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE,
                                   related_name='children', to='comments.CommentGame')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Comment (Game)',
                'verbose_name_plural': 'Comments (Game)',
                'ordering': ('-created',),
            },
        ),
        migrations.CreateModel(
            name='LikeGame',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('added', models.DateTimeField()),
                ('comment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='likes',
                                              to='comments.CommentGame')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Like (Game)',
                'verbose_name_plural': 'Likes (Game)',
                'unique_together': {('user', 'comment')},
            },
        ),
    ]
