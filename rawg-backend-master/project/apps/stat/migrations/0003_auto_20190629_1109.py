import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('stat', '0002_auto_20190606_1024'),
    ]

    operations = [
        migrations.AlterField(
            model_name='carouselrating',
            name='user',
            field=models.ForeignKey(blank=True, editable=False, null=True,
                                    on_delete=django.db.models.deletion.SET_NULL, related_name='+',
                                    to=settings.AUTH_USER_MODEL),
        ),
    ]
