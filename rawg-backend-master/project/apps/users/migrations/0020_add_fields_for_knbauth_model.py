from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0019_user_api_group_changed'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='gid',
            field=models.CharField(
                blank=True,
                null=True,
                editable=False,
                max_length=32,
                unique=True,
                verbose_name='идентификатор в системе авторизации'
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='url_avatar',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='is_confirmed',
            field=models.BooleanField(default=False, editable=False),
        ),
    ]
