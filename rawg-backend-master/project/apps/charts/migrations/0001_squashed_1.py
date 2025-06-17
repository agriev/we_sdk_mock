from django.db import migrations, models

import apps.charts.models


class Migration(migrations.Migration):
    replaces = [('charts', '0001_squashed'), ('charts', '0002_auto_20180607_1115')]

    initial = True

    dependencies = [
        ('credits', '__first__'),
        ('games', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='GameFull',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('position', models.PositiveIntegerField()),
                ('count', models.PositiveIntegerField()),
                ('week', models.DateTimeField()),
                ('game', models.ForeignKey(on_delete=models.deletion.CASCADE, to='games.Game')),
            ],
            options={
                'verbose_name': 'Game full',
                'verbose_name_plural': 'Games full',
            },
        ),
        migrations.CreateModel(
            name='GameYear',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('position', models.PositiveIntegerField()),
                ('count', models.PositiveIntegerField()),
                ('week', models.DateTimeField()),
                ('game', models.ForeignKey(on_delete=models.deletion.CASCADE, to='games.Game')),
            ],
            options={
                'verbose_name': 'Game year',
                'verbose_name_plural': 'Games year',
            },
        ),
        migrations.CreateModel(
            name='GameGenre',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('position', models.PositiveIntegerField()),
                ('count', models.PositiveIntegerField()),
                ('week', models.DateTimeField()),
                ('game', models.ForeignKey(on_delete=models.deletion.CASCADE, to='games.Game')),
                ('genre', models.ForeignKey(on_delete=models.deletion.CASCADE, to='games.Genre')),
            ],
            options={
                'verbose_name': 'Game genre',
                'verbose_name_plural': 'Games genre',
            },
            bases=(apps.charts.models.ChartMixin, models.Model),
        ),
        migrations.CreateModel(
            name='GameReleased',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('position', models.PositiveIntegerField()),
                ('count', models.PositiveIntegerField()),
                ('week', models.DateTimeField()),
                ('released', models.PositiveIntegerField()),
                ('game', models.ForeignKey(on_delete=models.deletion.CASCADE, to='games.Game')),
            ],
            options={
                'verbose_name': 'Game released',
                'verbose_name_plural': 'Games released',
            },
            bases=(apps.charts.models.ChartMixin, models.Model),
        ),
        migrations.CreateModel(
            name='GameToPlay',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('position', models.PositiveIntegerField()),
                ('count', models.PositiveIntegerField()),
                ('week', models.DateTimeField()),
                ('game', models.ForeignKey(on_delete=models.deletion.CASCADE, to='games.Game')),
            ],
            options={
                'verbose_name': 'Game to play',
                'verbose_name_plural': 'Games to play',
            },
            bases=(apps.charts.models.ChartMixin, models.Model),
        ),
        migrations.CreateModel(
            name='GameCreditPerson',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('position', models.PositiveIntegerField()),
                ('count', models.PositiveIntegerField()),
                ('week', models.DateTimeField()),
                ('game', models.ForeignKey(on_delete=models.deletion.CASCADE, to='games.Game')),
                ('person', models.ForeignKey(on_delete=models.deletion.CASCADE, to='credits.Person')),
            ],
            options={
                'verbose_name': 'Game person',
                'verbose_name_plural': 'Games person',
            },
            bases=(apps.charts.models.ChartMixin, models.Model),
        ),
        migrations.CreateModel(
            name='GameUpcoming',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('position', models.PositiveIntegerField()),
                ('count', models.PositiveIntegerField()),
                ('week', models.DateTimeField()),
                ('game', models.ForeignKey(on_delete=models.deletion.CASCADE, to='games.Game')),
            ],
            options={
                'verbose_name': 'Game upcoming',
                'verbose_name_plural': 'Games upcoming',
            },
            bases=(apps.charts.models.ChartMixin, models.Model),
        ),
    ]
