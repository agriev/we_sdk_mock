import django.contrib.postgres.fields
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models

import apps.utils.models


class Migration(migrations.Migration):
    replaces = [('token', '0001_initial'), ('token', '0002_auto_20180628_1138'), ('token', '0003_cycle_finished'),
                ('token', '0004_auto_20180711_1517'), ('token', '0005_auto_20180712_0848'),
                ('token', '0006_cyclekarma_is_new'), ('token', '0006_cyclekarma_achieved'),
                ('token', '0007_merge_20180723_1357'), ('token', '0008_cycle_data'),
                ('token', '0009_cycleuser_karma_is_exchanged'), ('token', '0010_auto_20180802_0748')]

    initial = True

    dependencies = [
        ('achievements', '__first__'),
        ('games', '__first__'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Cycle',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start', models.DateTimeField()),
                ('end', models.DateTimeField()),
                ('achievements', models.PositiveIntegerField(default=0, editable=False)),
                ('percent', models.PositiveIntegerField(default=0, editable=False)),
                ('status', models.CharField(
                    choices=[('new', 'New'), ('active', 'Active'), ('finishing', 'Finishing'), ('success', 'Success'),
                             ('completed', 'Completed'), ('failure', 'Failure')], db_index=True, default='new',
                    editable=False, max_length=10)),
            ],
            options={
                'verbose_name': 'Cycle',
                'verbose_name_plural': 'Cycles',
            },
        ),
        migrations.CreateModel(
            name='CycleStage',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('achievements', models.PositiveIntegerField()),
                ('tokens', models.PositiveIntegerField()),
                ('cycle',
                 models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='stages', to='token.Cycle')),
            ],
            options={
                'verbose_name': 'Cycle Stage',
                'verbose_name_plural': 'Cycle Stages',
            },
        ),
        migrations.CreateModel(
            name='CycleUser',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('karma', models.PositiveIntegerField(default=0, editable=False)),
                ('achievements', models.PositiveIntegerField(default=0, editable=False)),
                ('achievements_gold', models.PositiveIntegerField(default=0, editable=False)),
                ('achievements_silver', models.PositiveIntegerField(default=0, editable=False)),
                ('achievements_bronze', models.PositiveIntegerField(default=0, editable=False)),
                ('position', models.PositiveIntegerField(db_index=True, editable=False)),
                ('position_yesterday', models.PositiveIntegerField(editable=False)),
                ('cycle',
                 models.ForeignKey(editable=False, on_delete=models.deletion.CASCADE, related_name='user_cycles',
                                   to='token.Cycle')),
                ('user',
                 models.ForeignKey(editable=False, on_delete=models.deletion.CASCADE, related_name='user_cycles',
                                   to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Cycle User',
                'verbose_name_plural': 'Cycle Users',
            },
        ),
        migrations.CreateModel(
            name='GameStatus',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(
                    choices=[('partner_cycle', 'Partnership for a cycle'), ('partner_always', 'Partnership always'),
                             ('exclude', 'Exclude')], default='partner_cycle', max_length=15)),
                ('cycle', models.ForeignKey(blank=True, default=None, null=True, on_delete=models.deletion.CASCADE,
                                            related_name='game_statuses', to='token.Cycle')),
                ('game',
                 models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='token_statuses', to='games.Game')),
            ],
            options={
                'verbose_name': 'Game Status',
                'verbose_name_plural': 'Game Statuses',
            },
        ),
        migrations.CreateModel(
            name='Subscription',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('cycle',
                 models.ForeignKey(editable=False, on_delete=models.deletion.CASCADE, related_name='subscriptions',
                                   to='token.Cycle')),
                ('user', models.ForeignKey(editable=False, on_delete=models.deletion.CASCADE,
                                           related_name='token_subscriptions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Subscription',
                'verbose_name_plural': 'Subscriptions',
            },
        ),
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('count', models.DecimalField(decimal_places=10, default=0, editable=False, max_digits=19)),
                ('operation', models.CharField(choices=[('in', 'In'), ('out', 'Out')], editable=False, max_length=3)),
                ('type', models.CharField(
                    choices=[('money', 'Input from/output to outside'), ('karma', 'Getting from karma'),
                             ('shop', 'Buying in shop')], editable=False, max_length=5)),
                ('user',
                 models.ForeignKey(editable=False, on_delete=models.deletion.CASCADE, related_name='transactions',
                                   to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Transaction',
                'verbose_name_plural': 'Transactions',
            },
        ),
        migrations.AlterUniqueTogether(
            name='subscription',
            unique_together={('cycle', 'user')},
        ),
        migrations.AlterUniqueTogether(
            name='cycleuser',
            unique_together={('cycle', 'user')},
        ),
        migrations.AddField(
            model_name='cycle',
            name='finished',
            field=models.DateTimeField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.CreateModel(
            name='CycleKarma',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('karma', models.PositiveIntegerField(default=0, editable=False)),
                ('cycle',
                 models.ForeignKey(editable=False, on_delete=models.deletion.CASCADE, related_name='cycle_karma',
                                   to='token.Cycle')),
                ('parent_achievement',
                 models.ForeignKey(editable=False, on_delete=models.deletion.CASCADE, related_name='cycle_karma',
                                   to='achievements.ParentAchievement')),
                ('user',
                 models.ForeignKey(editable=False, on_delete=models.deletion.CASCADE, related_name='cycle_karma',
                                   to=settings.AUTH_USER_MODEL)),
                ('is_new', models.BooleanField(default=True, editable=False)),
                ('achieved', models.DateTimeField(editable=False)),
            ],
            options={
                'verbose_name': 'Cycle Karma',
                'verbose_name_plural': 'Cycle Karma',
            },
            bases=(apps.utils.models.InitialValueMixin, models.Model),
        ),
        migrations.AlterUniqueTogether(
            name='cyclekarma',
            unique_together={('cycle', 'user', 'parent_achievement')},
        ),
        migrations.AlterModelOptions(
            name='cycleuser',
            options={'ordering': ('-karma', 'user_id'), 'verbose_name': 'Cycle User',
                     'verbose_name_plural': 'Cycle Users'},
        ),
        migrations.RemoveField(
            model_name='cycleuser',
            name='position',
        ),
        migrations.AlterField(
            model_name='cycleuser',
            name='karma',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False),
        ),
        migrations.AlterField(
            model_name='cycleuser',
            name='position_yesterday',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='cycle',
            name='data',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.IntegerField(), default=list,
                                                            editable=False, size=None),
        ),
        migrations.AddField(
            model_name='cycleuser',
            name='karma_is_exchanged',
            field=models.BooleanField(default=False),
        ),
    ]
