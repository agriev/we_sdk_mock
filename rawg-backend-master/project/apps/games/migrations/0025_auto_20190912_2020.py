import django.contrib.postgres.fields.citext
from django.db import migrations, models

import apps.utils.fields.autoslug


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0024_auto_20190912_1910'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='franchises_count',
            field=models.PositiveIntegerField(default=None, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='linked_count',
            field=models.PositiveIntegerField(default=None, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='parents_count',
            field=models.PositiveIntegerField(db_index=True, default=None, editable=False, null=True),
        ),
        migrations.CreateModel(
            name='Franchise',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug',
                 apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True)),
                ('name', django.contrib.postgres.fields.citext.CICharField(max_length=200, unique=True)),
                ('games', models.ManyToManyField(related_name='franchises', to='games.Game')),
            ],
            options={
                'verbose_name': 'Franchise',
                'verbose_name_plural': 'Franchises',
                'ordering': ('-id',),
            },
        ),
    ]
