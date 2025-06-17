import django.contrib.postgres.fields
import django.contrib.postgres.indexes
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    replaces = [('users', '0002_squashed_2'), ('users', '0003_usergame_last_played'),
                ('users', '0004_user_subscribe_mail_reviews_invite'), ('users', '0005_usergame_playtime_stores'),
                ('users', '0006_auto_20190218_1130'), ('users', '0007_auto_20190218_1459'),
                ('users', '0008_remove_user_avatar_source'), ('users', '0009_auto_20190312_1704'),
                ('users', '0010_auto_20190424_0956'), ('users', '0011_auto_20190424_0957'),
                ('users', '0012_auto_20190424_1829'), ('users', '0013_userfollowelement_last_viewed_id'),
                ('users', '0014_user_last_visited_games_ids')]

    dependencies = [
        ('games', '__first__'),
        ('contenttypes', '0002_remove_content_type_name'),
        ('users', '0001_squashed'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='games',
            field=models.ManyToManyField(blank=True, through='users.UserGame', to='games.Game'),
        ),
        migrations.AddField(
            model_name='user',
            name='game_background',
            field=models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE,
                                    related_name='+', to='games.Game'),
        ),
        migrations.AddField(
            model_name='usergame',
            name='game',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game'),
        ),
        migrations.AddField(
            model_name='usergame',
            name='platforms',
            field=models.ManyToManyField(blank=True, to='games.Platform'),
        ),
        migrations.AddField(
            model_name='userfollowcollection',
            name='collection',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='followers',
                                    to='games.Collection'),
        ),
        migrations.AddField(
            model_name='userfavoritegame',
            name='game',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game'),
        ),
        migrations.AddField(
            model_name='usergame',
            name='is_new',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterUniqueTogether(
            name='usergame',
            unique_together={('user', 'game')},
        ),
        migrations.AlterUniqueTogether(
            name='userfavoritegame',
            unique_together={('user', 'position'), ('user', 'game')},
        ),
        migrations.AlterUniqueTogether(
            name='userfollowcollection',
            unique_together={('user', 'collection')},
        ),
        migrations.AddField(
            model_name='user',
            name='reviews_text_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='user',
            name='feed_chronological',
            field=models.BooleanField(default=False),
        ),
        migrations.RemoveField(
            model_name='inviterequest',
            name='invite',
        ),
        migrations.DeleteModel(
            name='Invite',
        ),
        migrations.DeleteModel(
            name='InviteRequest',
        ),
        migrations.AddField(
            model_name='user',
            name='settings',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='referer',
            field=models.CharField(blank=True, default='', editable=False, max_length=500),
        ),
        migrations.AlterField(
            model_name='user',
            name='last_name',
            field=models.CharField(blank=True, max_length=150, verbose_name='last name'),
        ),
        migrations.AddField(
            model_name='user',
            name='gamer_tag_confirm',
            field=models.BooleanField(default=False, editable=False),
        ),
        migrations.AddField(
            model_name='user',
            name='gamer_tag_confirm_date',
            field=models.DateTimeField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='gamer_tag_uid_first_confirm',
            field=models.CharField(blank=True, editable=False, max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='psn_online_id_confirm',
            field=models.BooleanField(default=False, editable=False),
        ),
        migrations.AddField(
            model_name='user',
            name='psn_online_id_confirm_date',
            field=models.DateTimeField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='psn_online_id_first_confirm',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='steam_id_confirm',
            field=models.BooleanField(default=False, editable=False),
        ),
        migrations.AddField(
            model_name='user',
            name='steam_id_confirm_date',
            field=models.DateTimeField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='steam_id_uid_first_confirm',
            field=models.CharField(blank=True, editable=False, max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='token_program',
            field=models.BooleanField(default=False, editable=False),
        ),
        migrations.AddField(
            model_name='user',
            name='tokens',
            field=models.DecimalField(decimal_places=10, default=0, editable=False, max_digits=19),
        ),
        migrations.AddField(
            model_name='user',
            name='token_program_joined',
            field=models.DateTimeField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.CreateModel(
            name='UserReferer',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('added', models.DateTimeField(auto_now_add=True)),
                ('referer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='user_referer',
                                              to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='user_referred',
                                           to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'User Referers',
                'verbose_name': 'User Referer',
                'ordering': ('-added',),
                'unique_together': {('user', 'referer')},
            },
        ),
        migrations.AddField(
            model_name='user',
            name='last_sync_psn_fast',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='last_sync_steam_fast',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='last_sync_xbox_fast',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='subscribe_mail_token',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='rated_games_percent',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='usergame',
            name='last_played',
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='subscribe_mail_reviews_invite',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='usergame',
            name='playtime_stores',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.AlterField(
            model_name='usergame',
            name='playtime',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='user',
            name='gog',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='gog_date',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='gog_status',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='user',
            name='last_sync_gog',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='last_sync_gog_fast',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.RemoveField(
            model_name='user',
            name='avatar_source',
        ),
        migrations.AlterField(
            model_name='user',
            name='select_platform',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterModelOptions(
            name='userfollow',
            options={'ordering': ('-added',), 'verbose_name': 'User Follow User',
                     'verbose_name_plural': 'User Follow Users'},
        ),
        migrations.AlterModelOptions(
            name='userfavoritegame',
            options={'ordering': ('-added',), 'verbose_name': 'User Favorite Game',
                     'verbose_name_plural': 'User Favorite Games'},
        ),
        migrations.CreateModel(
            name='UserFollowElement',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('object_id', models.PositiveIntegerField()),
                ('added', models.DateTimeField(db_index=True)),
                ('content_type',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='contenttypes.ContentType')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='follows',
                                           to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Follow Element',
                'verbose_name_plural': 'User Follow Elements',
                'ordering': ('-added',),
                'unique_together': {('user', 'content_type', 'object_id')},
            },
        ),
        migrations.AlterUniqueTogether(
            name='userfollow',
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name='userfollow',
            name='follow',
        ),
        migrations.RemoveField(
            model_name='userfollow',
            name='user',
        ),
        migrations.AlterUniqueTogether(
            name='userfollowcollection',
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name='userfollowcollection',
            name='collection',
        ),
        migrations.RemoveField(
            model_name='userfollowcollection',
            name='user',
        ),
        migrations.AlterModelOptions(
            name='userfavoritegame',
            options={'verbose_name': 'User Favorite Game', 'verbose_name_plural': 'User Favorite Games'},
        ),
        migrations.AlterField(
            model_name='userfollowelement',
            name='added',
            field=models.DateTimeField(),
        ),
        migrations.AddIndex(
            model_name='userfollowelement',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['added'], name='users_userf_added_3462b6_brin'),
        ),
        migrations.DeleteModel(
            name='UserFollow',
        ),
        migrations.DeleteModel(
            name='UserFollowCollection',
        ),
        migrations.AddField(
            model_name='userfollowelement',
            name='last_viewed_id',
            field=models.PositiveIntegerField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='last_visited_games_ids',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.PositiveIntegerField(), default=list,
                                                            editable=False, size=None),
        ),
    ]
