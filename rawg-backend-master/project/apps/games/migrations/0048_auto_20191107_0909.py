from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0047_auto_20191016_1648'),
    ]

    operations = [
        migrations.AlterField(
            model_name='collection',
            name='description',
            field=models.TextField(blank=True, default='', max_length=1000),
        ),
        migrations.AlterField(
            model_name='collection',
            name='name',
            field=models.CharField(max_length=200),
        ),
    ]
