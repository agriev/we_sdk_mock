import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('credits', '0005_auto_20190715_2058'),
    ]

    operations = [
        migrations.AlterField(
            model_name='person',
            name='merge_with',
            field=models.PositiveIntegerField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.AlterField(
            model_name='person',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            default=list, editable=False, size=None),
        ),
    ]
