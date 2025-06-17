import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0026_auto_20190912_2021'),
    ]

    operations = [
        migrations.AlterField(
            model_name='featured',
            name='game',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='featured',
                                    to='games.Game'),
        ),
        migrations.AlterField(
            model_name='game',
            name='developers',
            field=models.ManyToManyField(blank=True, to='games.Developer'),
        ),
        migrations.AlterField(
            model_name='game',
            name='franchises_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AlterField(
            model_name='game',
            name='genres',
            field=models.ManyToManyField(to='games.Genre'),
        ),
        migrations.AlterField(
            model_name='game',
            name='linked_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AlterField(
            model_name='game',
            name='parents_count',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False),
        ),
        migrations.AlterField(
            model_name='game',
            name='publishers',
            field=models.ManyToManyField(blank=True, to='games.Publisher'),
        ),
        migrations.AlterField(
            model_name='game',
            name='tags',
            field=models.ManyToManyField(to='games.Tag'),
        ),
        migrations.AlterField(
            model_name='linkedgame',
            name='link_type',
            field=models.CharField(choices=[('dlc', 'DLC'), ('edition', 'Edition')], default='dlc', max_length=7),
        ),
    ]
