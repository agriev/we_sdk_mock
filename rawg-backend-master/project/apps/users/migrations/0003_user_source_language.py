from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0002_squashed_3'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='source_language',
            field=models.CharField(choices=[('en', 'English'), ('ru', 'Russian')], default=None, max_length=2,
                                   null=True),
        ),
    ]
