from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Banner',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField()),
                ('url', models.URLField(blank=True, default='')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('active', models.BooleanField(db_index=True, default=False)),
                ('url_text', models.TextField(blank=True, default='')),
            ],
            options={
                'verbose_name': 'Banner',
                'verbose_name_plural': 'Banners',
                'ordering': ('-id',),
            },
        ),
    ]
