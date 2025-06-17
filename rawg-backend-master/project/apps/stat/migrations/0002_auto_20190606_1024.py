from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('stat', '0001_squashed_1'),
    ]

    operations = [
        migrations.AlterField(
            model_name='story',
            name='second',
            field=models.PositiveIntegerField(editable=False),
        ),
    ]
