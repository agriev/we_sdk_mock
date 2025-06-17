from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('recommendations', '0001_squashed'),
    ]

    operations = [
        migrations.AlterModelTable(
            name='userrecommendation',
            table=None,
        ),
        migrations.AlterModelTable(
            name='userrecommendationqueue',
            table=None,
        ),
    ]
