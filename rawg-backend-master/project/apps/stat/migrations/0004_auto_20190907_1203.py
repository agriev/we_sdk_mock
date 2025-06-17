import django.contrib.postgres.fields
import django.contrib.postgres.indexes
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('games', '0021_delete_promofeatured'),
        ('stat', '0003_auto_20190629_1109'),
    ]

    operations = [
        migrations.CreateModel(
            name='RecommendationsVisit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('datetime', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'verbose_name': 'Recommendations Visit',
                'verbose_name_plural': 'Recommendations Visits',
                'ordering': ('-id',),
            },
        ),
        migrations.CreateModel(
            name='RecommendedGameAdding',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sources',
                 django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=13), default=list,
                                                           editable=False, size=None)),
                ('datetime', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'verbose_name': 'Recommended Game Adding',
                'verbose_name_plural': 'Recommended Game Adding',
                'ordering': ('-id',),
            },
        ),
        migrations.CreateModel(
            name='RecommendedGameVisit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sources',
                 django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=13), default=list,
                                                           editable=False, size=None)),
                ('datetime', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'verbose_name': 'Recommended Game Visit',
                'verbose_name_plural': 'Recommended Game Visits',
                'ordering': ('-id',),
            },
        ),
        migrations.AddIndex(
            model_name='carouselrating',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['datetime'],
                                                            name='stat_carous_datetim_6cb104_brin'),
        ),
        migrations.AddIndex(
            model_name='status',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['datetime'],
                                                            name='stat_status_datetim_f7fb09_brin'),
        ),
        migrations.AddIndex(
            model_name='story',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['datetime'],
                                                            name='stat_story_datetim_9e693b_brin'),
        ),
        migrations.AddIndex(
            model_name='visit',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['datetime'],
                                                            name='stat_visit_datetim_8a4ed1_brin'),
        ),
        migrations.AddField(
            model_name='recommendedgamevisit',
            name='game',
            field=models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                    to='games.Game'),
        ),
        migrations.AddField(
            model_name='recommendedgamevisit',
            name='user',
            field=models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                    to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='recommendedgameadding',
            name='game',
            field=models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                    to='games.Game'),
        ),
        migrations.AddField(
            model_name='recommendedgameadding',
            name='user',
            field=models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                    to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='recommendationsvisit',
            name='user',
            field=models.ForeignKey(editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                    to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddIndex(
            model_name='recommendedgamevisit',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['datetime'],
                                                            name='stat_recomm_datetim_365963_brin'),
        ),
        migrations.AddIndex(
            model_name='recommendedgameadding',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['datetime'],
                                                            name='stat_recomm_datetim_7e092a_brin'),
        ),
        migrations.AddIndex(
            model_name='recommendationsvisit',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['datetime'],
                                                            name='stat_recomm_datetim_4b5e83_brin'),
        ),
    ]
