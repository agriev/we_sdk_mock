from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0028_auto_20190918_1847'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='game',
            name='collections_count',
        ),
        migrations.RemoveField(
            model_name='game',
            name='discussions_count',
        ),
        migrations.RemoveField(
            model_name='game',
            name='reviews_text_count',
        ),
        migrations.AlterField(
            model_name='game',
            name='collections_count_all',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AlterField(
            model_name='game',
            name='discussions_count_all',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AlterField(
            model_name='game',
            name='reviews_text_count_all',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
    ]
