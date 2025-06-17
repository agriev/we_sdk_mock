import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('merger', '0001_squashed_2'),
    ]

    operations = [
        migrations.AddField(
            model_name='mergedslug',
            name='manual',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='mergedslug',
            name='content_type',
            field=models.ForeignKey(db_index=False, on_delete=django.db.models.deletion.CASCADE,
                                    to='contenttypes.ContentType'),
        ),
        migrations.AlterField(
            model_name='mergedslug',
            name='new_slug',
            field=models.SlugField(db_index=False),
        ),
    ]
