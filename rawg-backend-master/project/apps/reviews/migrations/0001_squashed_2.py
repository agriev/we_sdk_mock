import django.contrib.postgres.fields.jsonb
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.reviews.models


class Migration(migrations.Migration):
    replaces = [('reviews', '0001_squashed_1'), ('reviews', '0002_auto_20190404_1009'),
                ('reviews', '0003_review_external_avatar'), ('reviews', '0004_auto_20190417_1043')]

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('games', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='Reaction',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=100)),
                ('positive', models.BooleanField(db_index=True, default=True)),
            ],
            options={
                'verbose_name': 'Reaction',
                'ordering': ('id',),
                'verbose_name_plural': 'Reactions',
            },
        ),
        migrations.CreateModel(
            name='Review',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(blank=True)),
                ('rating', models.PositiveIntegerField(
                    choices=[(5, 'exceptional'), (4, 'recommended'), (3, 'meh'), (1, 'skip')])),
                ('created', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('edited', models.DateTimeField(auto_now=True)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reviews',
                                           to='games.Game')),
                ('reactions', models.ManyToManyField(blank=True, to='reviews.Reaction')),
                ('user',
                 models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reviews',
                                   to=settings.AUTH_USER_MODEL)),
                ('is_text', models.BooleanField(db_index=True, default=False)),
                ('likes_count', models.PositiveIntegerField(default=0, editable=False)),
                ('likes_rating', models.IntegerField(db_index=True, default=0, editable=False)),
                ('likes_positive', models.PositiveIntegerField(db_index=True, default=0, editable=False)),
                ('comments_count', models.PositiveIntegerField(default=0, editable=False)),
                ('hidden', models.BooleanField(db_index=True, default=False)),
                ('language', models.CharField(db_index=True, default='', editable=False, max_length=3)),
                ('language_detection', models.PositiveIntegerField(default=0, editable=False)),
                ('comments_attached',
                 django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True)),
                ('likes_fake', models.IntegerField(default=0)),
                ('text_safe', models.TextField(blank=True, editable=False)),
                ('text_bare', models.TextField(blank=True, editable=False)),
                ('text_preview', models.TextField(blank=True, editable=False)),
                ('text_attachments', models.PositiveIntegerField(default=0, editable=False)),
                ('text_previews',
                 django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True)),
                ('posts_count', models.PositiveIntegerField(default=0, editable=False)),
                ('comments_parent_count', models.PositiveIntegerField(default=0, editable=False)),
                ('external_author', models.TextField(blank=True, default='', editable=False)),
                ('external_lang', models.TextField(blank=True, default='', editable=False)),
                ('external_source', models.URLField(blank=True, default='', max_length=500)),
                ('external_store',
                 models.ForeignKey(editable=False, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                   to='games.GameStore')),
                ('external_avatar', models.FileField(blank=True, max_length=1000, null=True,
                                                     upload_to=apps.reviews.models.external_user_avatar)),
            ],
            options={
                'verbose_name': 'Review',
                'ordering': ('-id',),
                'verbose_name_plural': 'Reviews',
                'unique_together': {('user', 'game')},
            },
        ),
        migrations.CreateModel(
            name='Like',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('added', models.DateTimeField(auto_now_add=True)),
                ('review', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='likes',
                                             to='reviews.Review')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('positive', models.BooleanField(db_index=True, default=True)),
            ],
            options={
                'verbose_name': 'Like',
                'verbose_name_plural': 'Likes',
                'unique_together': {('user', 'review')},
            },
        ),
        migrations.CreateModel(
            name='Versus',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('review_first', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                                   to='reviews.Review')),
                ('review_second', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                                    to='reviews.Review')),
            ],
            options={
                'verbose_name': 'Versus',
                'verbose_name_plural': 'Versus',
            },
        ),
    ]
