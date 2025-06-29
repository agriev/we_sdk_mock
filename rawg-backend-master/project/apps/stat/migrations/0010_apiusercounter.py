# Generated by Django 2.2.15 on 2020-11-25 10:35

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('stat', '0009_apibyuservisit'),
    ]

    operations = [
        migrations.CreateModel(
            name='APIUserCounter',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(editable=False)),
                ('count', models.PositiveIntegerField(editable=False)),
                (
                    'user',
                    models.ForeignKey(
                        editable=False, on_delete=django.db.models.deletion.CASCADE, related_name='+',
                        to=settings.AUTH_USER_MODEL
                    )
                ),
            ],
            options={
                'verbose_name': 'API Counter',
                'verbose_name_plural': 'API Counters',
                'ordering': ('-id',),
                'unique_together': {('user', 'date')},
            },
        ),
    ]
