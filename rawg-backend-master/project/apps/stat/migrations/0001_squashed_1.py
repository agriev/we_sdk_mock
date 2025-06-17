import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    replaces = [('stat', '0001_squashed'), ('stat', '0002_carouselrating'), ('stat', '0003_auto_20190123_1257'),
                ('stat', '0004_story')]

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Visit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('datetime', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                           to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('-id',),
                'verbose_name_plural': 'Visits',
                'verbose_name': 'Visit',
            },
        ),
        migrations.CreateModel(
            name='Status',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(max_length=10)),
                ('datetime', models.DateTimeField(db_index=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='+',
                                           to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('-id',),
                'verbose_name_plural': 'Statuses',
                'verbose_name': 'Status',
            },
        ),
        migrations.CreateModel(
            name='CarouselRating',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(editable=False, max_length=20)),
                ('cid', models.CharField(editable=False, max_length=50)),
                ('ip', models.CharField(editable=False, max_length=15)),
                ('user_agent', models.CharField(editable=False, max_length=200)),
                ('datetime', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('user',
                 models.ForeignKey(blank=True, editable=False, null=True, on_delete=django.db.models.deletion.CASCADE,
                                   related_name='+', to=settings.AUTH_USER_MODEL)),
                ('rating', models.PositiveSmallIntegerField(blank=True, editable=False, null=True)),
                ('slug', models.CharField(editable=False, max_length=50)),
            ],
            options={
                'verbose_name': 'Carousel Rating',
                'verbose_name_plural': 'Carousel Ratings',
                'ordering': ('-id',),
            },
        ),
        migrations.CreateModel(
            name='Story',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cid', models.CharField(editable=False, max_length=50)),
                ('second', models.PositiveSmallIntegerField(editable=False)),
                ('domain', models.CharField(blank=True, editable=False, max_length=50, null=True)),
                ('ip', models.CharField(editable=False, max_length=15)),
                ('user_agent', models.CharField(editable=False, max_length=200)),
                ('datetime', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'verbose_name': 'Story',
                'verbose_name_plural': 'Stories',
                'ordering': ('-id',),
            },
        ),
    ]
