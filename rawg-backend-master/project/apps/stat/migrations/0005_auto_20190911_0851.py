import django.contrib.postgres.fields
import django.contrib.postgres.indexes
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0022_auto_20190910_1156'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('stat', '0004_auto_20190907_1203'),
    ]

    operations = [
        migrations.AddField(
            model_name='recommendedgameadding',
            name='status',
            field=models.CharField(default='', editable=False, max_length=10),
        ),
        migrations.CreateModel(
            name='RecommendedGameStoreVisit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sources',
                 django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=13), default=list,
                                                           editable=False, size=None)),
                ('hidden', models.BooleanField(default=False, editable=False)),
                ('datetime', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('game',
                 models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                   to='games.Game')),
                ('store',
                 models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                   to='games.Store')),
                ('user',
                 models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                   to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Recommended Game Store Visit',
                'verbose_name_plural': 'Recommended Game Store Visits',
                'ordering': ('-id',),
            },
        ),
        migrations.AddIndex(
            model_name='recommendedgamestorevisit',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['datetime'],
                                                            name='stat_recomm_datetim_47002b_brin'),
        ),
    ]
