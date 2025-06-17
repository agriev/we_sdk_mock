import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.utils.models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('games', '0003_auto_20190611_1425'),
        ('reviews', '0001_squashed_2'),
    ]

    operations = [
        migrations.CreateModel(
            name='EditorialReview',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('hidden', models.BooleanField(db_index=True, default=False)),
                ('text', models.TextField(blank=True)),
                ('rating',
                 models.PositiveSmallIntegerField(validators=[django.core.validators.MaxValueValidator(100)])),
                ('created', models.DateTimeField()),
                ('game',
                 models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='editorial_review',
                                      to='games.Game')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                           related_name='editorial_reviews', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Editorial Review',
                'verbose_name_plural': 'Editorial Reviews',
                'ordering': ('-id',),
            },
            bases=(apps.utils.models.InitialValueMixin, models.Model),
        ),
    ]
