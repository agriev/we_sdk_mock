from bulk_update.helper import bulk_update
from django.conf import settings
from django.db import migrations
from tqdm import tqdm


def forwards_func(apps, schema_editor):
    model = apps.get_model('achievements', 'ParentAchievement')
    model.objects.update(
        language=settings.MODELTRANSLATION_DEFAULT_LANGUAGE_ISO3
    )
    update_games_counts = set()
    for letter in "абвгдезийкклмнопрстууфхъыьАБВГДЕЗИЙККЛМНОПРСТУУФХЪЫЬ":
        qs = model.objects.filter(name__contains=letter)
        print(letter, '-', qs.update(language=settings.LANGUAGE_RUS))
        games = set(filter(None, qs.values_list('game_id', flat=True)))
        update_games_counts = update_games_counts.union(games)

    print('Games with russian achievements', len(update_games_counts))

    model = apps.get_model('games', 'Game')
    qs = model.objects.only('id', 'parent_achievements_counts', 'parent_achievements_count_all')
    data = []
    for game in tqdm(qs.iterator(), total=qs.count()):
        if game.id in update_games_counts:
            game.parent_achievements_counts = {
                settings.LANGUAGE_ENG:
                    game.parent_achievements.filter(hidden=False, language=settings.LANGUAGE_ENG).count(),
                settings.LANGUAGE_RUS:
                    game.parent_achievements.filter(hidden=False, language=settings.LANGUAGE_RUS).count(),
            }
        else:
            game.parent_achievements_counts = {'eng': game.parent_achievements_count_all, 'rus': 0}
        data.append(game)
    bulk_update(data, update_fields=['parent_achievements_counts'], batch_size=2000)


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('achievements', '0002_auto_20190719_0858'),
        ('games', '0014_auto_20190719_0900'),
    ]

    operations = [
        migrations.RunPython(
            forwards_func,
            reverse_func
        )
    ]
