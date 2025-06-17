from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0004_auto_20190730_1336'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='source_language',
            field=models.CharField(
                choices=[('en', 'English'), ('ru', 'Russian')], default='en', editable=False, max_length=2
            ),
        ),
    ]
