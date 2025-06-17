from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('comments', '0001_squashed_2'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='likegame',
            unique_together=None,
        ),
        migrations.RemoveField(
            model_name='likegame',
            name='comment',
        ),
        migrations.RemoveField(
            model_name='likegame',
            name='user',
        ),
        migrations.DeleteModel(
            name='CommentGame',
        ),
        migrations.DeleteModel(
            name='LikeGame',
        ),
    ]
