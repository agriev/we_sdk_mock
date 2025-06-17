from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('files', '0002_auto_20190619_1931'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cheatcode',
            name='category',
            field=models.CharField(
                choices=[
                    ('code', 'Cheat-code'), ('easter', 'Easter egg'), ('faq', 'FAQ'), ('hints', 'Hint'),
                    ('hex', 'HEX-code'), ('sol', 'Solution'), ('edit', 'Editor'), ('ghack', 'GH-Table'),
                    ('gwiz', 'GW-Table'), ('mtc', 'MTC-Table'), ('save', 'Savegame'), ('train', 'Trainer'),
                    ('uge', 'UGE-Module'), ('uhs', 'UHS-Module'), ('msc', 'Misc.'), ('amtab', 'ArtMoney Table'),
                    ('sol_pak', 'Solution Packed'), ('ach', 'Achievement'), ('faq_pak', 'FAQ Packed')
                ],
                db_index=True,
                max_length=7
            ),
        ),
    ]
