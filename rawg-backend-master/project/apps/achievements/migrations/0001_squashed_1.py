import django.contrib.postgres.fields.citext
from django.conf import settings
from django.db import migrations, models

import apps.achievements.models
import apps.utils.models


class Migration(migrations.Migration):
    replaces = [
        ('achievements', '0001_squashed'), ('achievements', '0002_auto_20180530_1217'),
        ('achievements', '0003_achievement_image_file'), ('achievements', '0004_auto_20180605_1222'),
        ('achievements', '0005_auto_20180626_0829'), ('achievements', '0006_auto_20180626_1321'),
        ('achievements', '0007_auto_20180626_1831'), ('achievements', '0008_parentachievementgame'),
        ('achievements', '0009_auto_20180809_1344')
    ]

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('games', '__first__'),
        ('merger', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='Achievement',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('uid', models.CharField(max_length=200)),
                ('name', models.CharField(max_length=250)),
                ('description', models.TextField(blank=True)),
                ('type', models.CharField(blank=True, default='', max_length=10)),
                ('image_file',
                 models.FileField(blank=True, null=True, upload_to=apps.achievements.models.achievement_image)),
                ('image_source', models.URLField(blank=True, default='', max_length=500)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('percent',
                 models.DecimalField(db_index=True, decimal_places=2, default=0, editable=False, max_digits=5)),
                ('hidden', models.BooleanField(default=False)),
                ('recalculate', models.BooleanField(default=False)),
                ('network', models.ForeignKey(on_delete=models.deletion.CASCADE, to='merger.Network')),
            ],
            options={
                'verbose_name': 'Achievement',
                'verbose_name_plural': 'Achievements',
                'ordering': ('percent',),
            },
            bases=(apps.utils.models.InitialValueMixin, models.Model),
        ),
        migrations.CreateModel(
            name='ParentAchievement',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', django.contrib.postgres.fields.citext.CICharField(max_length=250)),
                ('game_name', models.CharField(default='', max_length=200)),
                ('percent',
                 models.DecimalField(db_index=True, decimal_places=2, default=0, editable=False, max_digits=5)),
                ('hidden', models.BooleanField(default=False)),
                ('recalculate', models.BooleanField(default=False)),
                ('game', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL,
                                           related_name='parent_achievements', to='games.Game')),
            ],
            options={
                'verbose_name': 'Parent Achievement',
                'verbose_name_plural': 'Parent Achievements',
                'ordering': ('percent',),
            },
            bases=(apps.utils.models.InitialValueMixin, models.Model),
        ),
        migrations.CreateModel(
            name='UserAchievement',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('achieved', models.DateTimeField(blank=True, null=True)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('achievement',
                 models.ForeignKey(on_delete=models.deletion.CASCADE, to='achievements.Achievement')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User achievement',
                'verbose_name_plural': 'User achievements',
            },
            bases=(apps.utils.models.InitialValueMixin, models.Model),
        ),
        migrations.AddField(
            model_name='achievement',
            name='parent',
            field=models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='achievements',
                                    to='achievements.ParentAchievement'),
        ),
        migrations.CreateModel(
            name='ParentAchievementGame',
            fields=[
            ],
            options={
                'verbose_name': 'Parent Achievement Without Game',
                'verbose_name_plural': 'Parent Achievements Without Games',
                'proxy': True,
                'indexes': [],
            },
            bases=('achievements.parentachievement',),
        ),
        migrations.AlterUniqueTogether(
            name='userachievement',
            unique_together={('user', 'achievement')},
        ),
        migrations.AlterUniqueTogether(
            name='parentachievement',
            unique_together={('name', 'game', 'game_name')},
        ),
        migrations.AlterUniqueTogether(
            name='achievement',
            unique_together={('uid', 'network')},
        ),
    ]
