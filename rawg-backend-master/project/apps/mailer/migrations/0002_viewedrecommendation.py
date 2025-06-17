import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0027_auto_20190914_1444'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('mailer', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ViewedRecommendation',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('game',
                 models.ForeignKey(db_index=False, on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Viewed Recommendation',
                'verbose_name_plural': 'Viewed Recommendations',
                'ordering': ('-id',),
                'unique_together': {('user', 'game')},
            },
        ),
    ]
