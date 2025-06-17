import django.contrib.postgres.fields.jsonb
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    replaces = [('discussions', '0001_squashed'), ('discussions', '0002_discussion_comments_parent_count')]

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('games', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='Discussion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('hidden', models.BooleanField(db_index=True, default=False)),
                ('language', models.CharField(db_index=True, default='', editable=False, max_length=3)),
                ('language_detection', models.PositiveIntegerField(default=0, editable=False)),
                ('title', models.CharField(blank=True, default='', max_length=100)),
                ('text', models.TextField()),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('edited', models.DateTimeField(auto_now=True)),
                ('comments_count', models.PositiveIntegerField(default=0, editable=False)),
                ('comments_attached',
                 django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True)),
                ('game',
                 models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='discussions', to='games.Game')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='discussions',
                                           to=settings.AUTH_USER_MODEL)),
                ('text_safe', models.TextField(blank=True, editable=False)),
                ('text_bare', models.TextField(blank=True, editable=False)),
                ('text_preview', models.TextField(blank=True, editable=False)),
                ('text_attachments', models.PositiveIntegerField(default=0, editable=False)),
                ('text_previews',
                 django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True)),
                ('posts_count', models.PositiveIntegerField(default=0, editable=False)),
                ('comments_parent_count', models.PositiveIntegerField(default=0, editable=False)),
            ],
            options={
                'verbose_name': 'Discussion',
                'ordering': ('-id',),
                'verbose_name_plural': 'Discussions',
            },
        ),
    ]
