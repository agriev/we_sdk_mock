from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('stat', '0008_auto_20200829_2139'),
    ]

    operations = [
        migrations.CreateModel(
            name='APIByUserVisit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id', models.CharField(editable=False, max_length=10)),
                ('date', models.DateField(db_index=True, editable=False)),
                ('count', models.PositiveIntegerField(default=0, editable=False)),
            ],
            options={
                'verbose_name': 'API by User Visit',
                'verbose_name_plural': 'API by User Visits',
                'ordering': ('-id',),
            },
        ),
    ]
