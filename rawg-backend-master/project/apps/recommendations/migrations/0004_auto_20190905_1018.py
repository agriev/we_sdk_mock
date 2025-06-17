from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('recommendations', '0003_auto_20190904_1602'),
    ]

    operations = [
        migrations.AddField(
            model_name='userrecommendationqueue',
            name='target',
            field=models.CharField(choices=[('meta', 'Meta'), ('collaborative', 'Collaborative')], db_index=True,
                                   default='meta', max_length=13),
        ),
        migrations.AlterField(
            model_name='userrecommendation',
            name='related_id',
            field=models.TextField(blank=True, default=None, null=True),
        ),
    ]
