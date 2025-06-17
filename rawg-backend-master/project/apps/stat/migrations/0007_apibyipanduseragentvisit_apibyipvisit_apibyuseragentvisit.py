from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('stat', '0006_auto_20191010_1035'),
    ]

    operations = [
        migrations.CreateModel(
            name='APIByIPAndUserAgentVisit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ip', models.CharField(editable=False, max_length=15)),
                ('user_agent', models.CharField(editable=False, max_length=200)),
                ('datetime', models.DateField(db_index=True, editable=False)),
            ],
            options={
                'verbose_name': 'API by IP and User Agent Visit',
                'verbose_name_plural': 'API by IP and User Agent Visits',
                'ordering': ('-id',),
            },
        ),
        migrations.CreateModel(
            name='APIByIPVisit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ip', models.CharField(editable=False, max_length=15)),
                ('datetime', models.DateField(db_index=True, editable=False)),
            ],
            options={
                'verbose_name': 'API by IP Visit',
                'verbose_name_plural': 'API by IP Visits',
                'ordering': ('-id',),
            },
        ),
        migrations.CreateModel(
            name='APIByUserAgentVisit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_agent', models.CharField(editable=False, max_length=200)),
                ('datetime', models.DateField(db_index=True, editable=False)),
            ],
            options={
                'verbose_name': 'API by User Agent Visit',
                'verbose_name_plural': 'API by User Agent Visits',
                'ordering': ('-id',),
            },
        ),
    ]
