from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    replaces = [('mocks', '0001_squashed'), ('mocks', '0002_token')]

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('games', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='Sync',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[
                    ('set_yesterday', 'Set a last visit as yesterday'),
                    ('set_yesterday_and_run', 'Set a last visit as yesterday and run a synchronization'),
                    ('set_old_and_run', 'Set a last visit as three weeks ago and run a synchronization')],
                    default='set_yesterday', max_length=30)),
                ('games', models.TextField(blank=True, default='',
                                           help_text='Add games to the synchronization. One id or slug on a line.')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Sync',
                'ordering': ('-id',),
                'verbose_name_plural': 'Syncs',
            },
        ),
        migrations.CreateModel(
            name='Feed',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('game_is_released', 'Game is released'),
                                                     ('offer_change_playing', 'Offer to change a playing status'),
                                                     ('offer_rate_game', 'Offer to rate a game'),
                                                     ('popular_games', 'Popular games'),
                                                     ('most_rated_games', 'Most rated games')], max_length=30)),
                ('game', models.ForeignKey(blank=True, default=None, null=True, on_delete=models.deletion.CASCADE,
                                           to='games.Game')),
                ('target_user',
                 models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('platform', models.ForeignKey(blank=True, default=None, null=True, on_delete=models.deletion.CASCADE,
                                               to='games.PlatformParent')),
            ],
            options={
                'verbose_name': 'Feed',
                'ordering': ('-id',),
                'verbose_name_plural': 'Feed',
            },
        ),
        migrations.CreateModel(
            name='Token',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(
                    choices=[('confirm_user', 'Confirm a user'), ('unconfirm_user', 'Unconfirm a user'),
                             ('add_achievements', 'Add achievements'), ('clear_cycle', 'Clear the active cycle'),
                             ('finish_cycle', 'Finish the active cycle')], default='confirm_user',
                    help_text='\n        - Confirm a user: fill a user field OR fill a count field to confirm N random'
                              ' users;<br>\n        - Unconfirm a user: fill a user field OR leave all fields blank'
                              ' to unconfirm all users;<br>\n        - Add achievements: fill a user field and a'
                              ' count field OR fill only a count field to add N achievements\n        '
                              'to random confirmed users;<br>\n        - Clear the active cycle: leave all fields '
                              'blank;<br>\n        - Finish the active cycle: leave all fields blank;\n    ',
                    max_length=30)),
                ('count', models.PositiveIntegerField(blank=True, default=None, null=True)),
                ('date', models.DateTimeField(blank=True, default=None, null=True)),
                ('user', models.ForeignKey(blank=True, default=None, null=True, on_delete=models.deletion.CASCADE,
                                           to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Token',
                'verbose_name_plural': 'Tokens',
                'ordering': ('-id',),
            },
        ),
    ]
