import django.contrib.postgres.fields
import django.db.models.deletion
from django.db import migrations, models

import apps.files.models
import apps.utils.fields.autoslug


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('games', '0003_auto_20190611_1425'),
    ]

    operations = [
        migrations.CreateModel(
            name='Software',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('version', models.CharField(blank=True, default='', max_length=30)),
                ('description', models.TextField(blank=True, default='')),
                ('price', models.CharField(blank=True, default='', max_length=20)),
                ('developer', models.CharField(blank=True, default='', max_length=100)),
                ('developer_url', models.CharField(blank=True, default='', max_length=250)),
                ('ui', models.CharField(blank=True, choices=[('gui', 'GUI'), ('console', 'Console/Command line'),
                                                             ('both', 'GUI + Console/Command line')], default='',
                                        max_length=7)),
                ('rus', models.CharField(blank=True, choices=[('yes', 'Интегрирован'), ('plugin', 'Плагин на сайте'),
                                                              ('no', 'Отсутствует')], default='', max_length=6)),
                ('type', models.CharField(blank=True, choices=[('freeware', 'Freeware'), ('shareware', 'Shareware'),
                                                               ('demo', 'Demo'),
                                                               ('fun-limited-demo', 'Functions limited demo'),
                                                               ('time-limited-demo', 'Time limited demo'),
                                                               ('commercial', 'Commercial')], default='',
                                          max_length=17)),
                ('systems',
                 django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=5), blank=True,
                                                           default=list, size=None)),
            ],
            options={
                'verbose_name': 'Software',
                'verbose_name_plural': 'Software',
                'ordering': ('-id',),
            },
        ),
        migrations.CreateModel(
            name='SoftwareFile',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('file', models.FileField(blank=True, default=None, null=True,
                                          upload_to=apps.files.models.software_file)),
                ('file_size', models.PositiveIntegerField(default=0)),
                ('created', models.DateTimeField()),
                ('software', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='files.Software')),
            ],
            options={
                'verbose_name': 'Software File',
                'verbose_name_plural': 'Software Files',
                'ordering': ('-id',),
            },
        ),
        migrations.CreateModel(
            name='SoftwareCategory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50)),
                ('slug',
                 apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True)),
                ('description', models.TextField(blank=True, default='')),
                ('parent',
                 models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE,
                                   related_name='children', to='files.SoftwareCategory')),
            ],
            options={
                'verbose_name': 'Software Category',
                'verbose_name_plural': 'Software Categories',
                'ordering': ('-id',),
            },
        ),
        migrations.AddField(
            model_name='software',
            name='categories',
            field=models.ManyToManyField(to='files.SoftwareCategory'),
        ),
        migrations.CreateModel(
            name='File',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('category',
                 models.CharField(choices=[('demo', 'Demo'), ('patch', 'Patch')], db_index=True, max_length=5)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, default='')),
                ('description_en', models.TextField(blank=True, default='', null=True)),
                ('description_ru', models.TextField(blank=True, default='', null=True)),
                ('file', models.FileField(blank=True, default=None, null=True, upload_to=apps.files.models.file)),
                ('file_size', models.PositiveIntegerField(default=0)),
                ('created', models.DateTimeField()),
                ('platforms',
                 django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=12), blank=True,
                                                           default=list, size=None)),
                ('languages',
                 django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=2), blank=True,
                                                           default=list, size=None)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
            ],
            options={
                'verbose_name': 'File',
                'verbose_name_plural': 'Files',
                'ordering': ('-id',),
            },
        ),
        migrations.CreateModel(
            name='CheatCode',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('category', models.CharField(
                    choices=[('code', 'Cheat-code'), ('easter', 'Easter egg'), ('faq', 'FAQ'), ('hints', 'Hint'),
                             ('hex', 'HEX-code'), ('sol', 'Solution'), ('edit', 'Editor'), ('ghack', 'GH-Table'),
                             ('gwiz', 'GW-Table'), ('mtc', 'MTC-Table'), ('save', 'Savegame'), ('train', 'Trainer'),
                             ('uge', 'UGE-Module'), ('uhs', 'UHS-Module'), ('msc', 'Misc.'),
                             ('amtab', 'ArtMoney Table')], db_index=True, max_length=6)),
                ('description', models.TextField(blank=True, default='')),
                ('file',
                 models.FileField(blank=True, default=None, null=True, upload_to=apps.files.models.cheat_code)),
                ('file_size', models.PositiveIntegerField(default=0)),
                ('created', models.DateTimeField()),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.Game')),
            ],
            options={
                'verbose_name': 'Cheat Code',
                'verbose_name_plural': 'Cheat Codes',
                'ordering': ('-id',),
            },
        ),
    ]
