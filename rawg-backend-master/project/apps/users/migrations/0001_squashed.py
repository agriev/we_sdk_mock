import django.contrib.auth.models
import django.contrib.postgres.fields.citext
import django.contrib.postgres.operations
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models

import apps.users.validators
import apps.utils.backend_storages
import apps.utils.strings
import apps.utils.upload
from apps.users.models import CustomUserManager, user_image


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('auth', '0008_alter_user_username_max_length'),
    ]

    operations = [
        django.contrib.postgres.operations.CITextExtension(),
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False,
                                                     help_text='Designates that this user has all permissions without '
                                                               'explicitly assigning them.',
                                                     verbose_name='superuser status')),
                ('username', models.CharField(error_messages={'unique': 'A user with that username already exists.'},
                                              help_text='Required. 150 characters or fewer. Letters, digits and '
                                                        '@/./+/-/_ only.',
                                              max_length=150, unique=True,
                                              validators=[django.contrib.auth.validators.UnicodeUsernameValidator()],
                                              verbose_name='username')),
                ('first_name', models.CharField(blank=True, max_length=30, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=30, verbose_name='last name')),
                ('is_staff', models.BooleanField(default=False,
                                                 help_text='Designates whether the user can log into this admin site.',
                                                 verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True,
                                                  help_text='Designates whether this user should be treated as active.'
                                                            ' Unselect this instead of deleting accounts.',
                                                  verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('groups', models.ManyToManyField(blank=True,
                                                  help_text='The groups this user belongs to. A user will get all '
                                                            'permissions granted to each of their groups.',
                                                  related_name='user_set', related_query_name='user', to='auth.Group',
                                                  verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True,
                                                            help_text='Specific permissions for this user.',
                                                            related_name='user_set', related_query_name='user',
                                                            to='auth.Permission', verbose_name='user permissions')),
            ],
            options={
                'verbose_name_plural': 'users',
                'verbose_name': 'user',
                'abstract': False,
            },
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name='UserGame',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(
                    choices=[('played', 'Played'), ('playing', 'Playing'), ('toplay', 'To play'),
                             ('completed', 'Completed')], default='played', max_length=10)),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('added', models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now)),
            ],
            options={
                'verbose_name': 'User Game',
                'verbose_name_plural': 'User Games',
            }
        ),
        migrations.AddField(
            model_name='user',
            name='avatar',
            field=models.ImageField(blank=True, null=True, upload_to=user_image),
        ),
        migrations.AddField(
            model_name='user',
            name='gamer_tag',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='psn_online_id',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='steam_id',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='full_name',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='gamer_tag_status',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='user',
            name='psn_online_id_status',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='user',
            name='steam_id_status',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AlterUniqueTogether(
            name='usergame',
            unique_together=set([]),
        ),
        migrations.AddField(
            model_name='user',
            name='gamer_tag_date',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='psn_online_id_date',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='steam_id_date',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AlterField(
            model_name='usergame',
            name='added',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name='usergame',
            name='status',
            field=models.CharField(
                choices=[('played', 'Played'), ('playing', 'Playing'), ('toplay', 'To play'), ('beaten', 'Beaten')],
                default='played', max_length=10),
        ),
        migrations.AlterField(
            model_name='usergame',
            name='status',
            field=models.CharField(
                choices=[('owned', 'Owned'), ('playing', 'Playing'), ('toplay', 'To play'), ('beaten', 'Beaten'),
                         ('dropped', 'Dropped')], default='owned', max_length=10),
        ),
        migrations.AlterField(
            model_name='usergame',
            name='added',
            field=models.DateTimeField(auto_now=True, db_index=True),
        ),
        migrations.AlterField(
            model_name='usergame',
            name='status',
            field=models.CharField(
                choices=[('owned', 'Owned'), ('playing', 'Playing'), ('toplay', 'To play'), ('beaten', 'Beaten'),
                         ('dropped', 'Dropped')], db_index=True, default='owned', max_length=10),
        ),
        migrations.AlterField(
            model_name='usergame',
            name='added',
            field=models.DateTimeField(db_index=True),
        ),
        migrations.AddField(
            model_name='usergame',
            name='created',
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        migrations.AddField(
            model_name='usergame',
            name='is_imported',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='usergame',
            name='playtime',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='usergame',
            name='hidden',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AlterField(
            model_name='usergame',
            name='status',
            field=models.CharField(
                choices=[('owned', 'Uncategorized'), ('playing', 'Currently playing'), ('toplay', 'Wishlist'),
                         ('beaten', 'Completed'), ('dropped', 'Played'), ('yet', 'Not played')], db_index=True,
                default='owned', max_length=10),
        ),
        migrations.CreateModel(
            name='Invite',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=10)),
                ('user', models.ForeignKey(blank=True, default=None, null=True, on_delete=models.deletion.CASCADE,
                                           to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='InviteRequest',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('invite', models.ForeignKey(blank=True, default=None, null=True, on_delete=models.deletion.CASCADE,
                                             to='users.Invite')),
                ('date', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.AlterField(
            model_name='invite',
            name='code',
            field=models.CharField(max_length=10, unique=True),
        ),
        migrations.AddField(
            model_name='user',
            name='last_entered',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AlterField(
            model_name='invite',
            name='code',
            field=models.CharField(default=apps.utils.strings.code, max_length=10, unique=True),
        ),
        migrations.AlterField(
            model_name='user',
            name='username',
            field=models.CharField(error_messages={'unique': 'A user with that username already exists.'},
                                   help_text='Required. 150 characters or fewer. Letters, digits and -/_ only.',
                                   max_length=150, unique=True, validators=[apps.users.validators.UsernameValidator],
                                   verbose_name='username'),
        ),
        migrations.AlterField(
            model_name='user',
            name='username',
            field=models.CharField(error_messages={'unique': 'A user with that username already exists.'},
                                   help_text='Required. 150 characters or fewer. Letters, digits and -/_ only.',
                                   max_length=150, unique=True, validators=[apps.users.validators.UsernameValidator()],
                                   verbose_name='username'),
        ),
        migrations.CreateModel(
            name='UserFollow',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('added', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('follow', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='following',
                                             to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='followers',
                                           to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('-added',),
                'verbose_name': 'User Follow',
                'verbose_name_plural': 'User Follows',
            },
        ),
        migrations.AlterUniqueTogether(
            name='userfollow',
            unique_together={('user', 'follow')},
        ),
        migrations.CreateModel(
            name='UserFollowCollection',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('added', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='followers_collection',
                                           to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('-added',),
                'verbose_name': 'User Follow Collection',
                'verbose_name_plural': 'User Follow Collections',
            },
        ),
        migrations.AddField(
            model_name='user',
            name='feedback_propose',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='slug',
            field=models.CharField(editable=False, max_length=150, unique=True),
        ),
        migrations.AddField(
            model_name='user',
            name='followers_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='user',
            name='following_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.CreateModel(
            name='UserFavoriteGame',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('position', models.PositiveIntegerField(db_index=True)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('edited', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='user',
            name='statistics',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='collections_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='user',
            name='comments_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='user',
            name='games_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='user',
            name='reviews_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AlterModelManagers(
            name='user',
            managers=[
                ('objects', CustomUserManager()),
            ],
        ),
        migrations.AddField(
            model_name='user',
            name='raptr',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='raptr_date',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='raptr_status',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='user',
            name='gamer_tag_uid',
            field=models.CharField(blank=True, editable=False, max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='steam_id_uid',
            field=models.CharField(blank=True, editable=False, max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='subscribe_mail_synchronization',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='last_sync_psn',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='last_sync_steam',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='last_sync_xbox',
            field=models.DateTimeField(blank=True, default=None, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='steam_games_playtime',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='select_platform',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='user',
            name='email',
            field=django.contrib.postgres.fields.citext.CIEmailField(max_length=254, unique=True),
        ),
        migrations.AlterField(
            model_name='user',
            name='slug',
            field=django.contrib.postgres.fields.citext.CICharField(editable=False, max_length=150, unique=True),
        ),
        migrations.AlterField(
            model_name='user',
            name='username',
            field=django.contrib.postgres.fields.citext.CICharField(
                error_messages={'unique': 'A user with that username already exists.'},
                help_text='Required. %(length)d+ characters or fewer. Letters, digits and -/_ only.',
                max_length=150,
                unique=True,
                validators=[apps.users.validators.UsernameValidator()]
            ),
        ),
        migrations.AlterField(
            model_name='user',
            name='subscribe_mail_synchronization',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterModelOptions(
            name='user',
            options={'ordering': ('-id',), 'verbose_name': 'User', 'verbose_name_plural': 'Users'},
        ),
        migrations.AddField(
            model_name='user',
            name='bio',
            field=models.TextField(blank=True, default='', max_length=512),
        ),
        migrations.AddField(
            model_name='user',
            name='bio_html',
            field=models.TextField(blank=True, default='', max_length=1024),
        ),
        migrations.AddField(
            model_name='user',
            name='all_languages',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='avatar_source',
            field=models.URLField(blank=True, editable=False, max_length=500),
        ),
    ]
