import django.contrib.postgres.indexes
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0035_auto_20191004_1848'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('recommendations', '0005_auto_20190905_1028'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserRecommendationDislike',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('game',
                 models.ForeignKey(db_index=False, on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Recommendation Dislike',
                'verbose_name_plural': 'User Recommendation Dislikes',
                'ordering': ('-id',),
            },
        ),
        migrations.AddIndex(
            model_name='userrecommendationdislike',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['created'],
                                                            name='recommendat_created_d5d9e0_brin'),
        ),
        migrations.AlterUniqueTogether(
            name='userrecommendationdislike',
            unique_together={('user', 'game')},
        ),
    ]
