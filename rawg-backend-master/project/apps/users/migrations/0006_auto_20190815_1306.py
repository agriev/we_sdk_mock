import django.contrib.postgres.fields
import django.contrib.postgres.indexes
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0018_auto_20190802_1438'),
        ('users', '0005_auto_20190730_1344'),
    ]

    operations = [
        migrations.AlterField(
            model_name='usergame',
            name='created',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AddIndex(
            model_name='usergame',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['created'],
                                                            name='users_userg_created_4dba63_brin'),
        ),
        migrations.AddIndex(
            model_name='userreferer',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['added'], name='users_userr_added_ea8753_brin'),
        ),
    ]
