import hashlib

from django.conf import settings
from django.template.defaultfilters import date
from django.utils import translation
from django.utils.timezone import now

from apps.common.seo import pluralize
from apps.credits.models import Person
from apps.reviews.models import Review


def order_genres(genres):
    positions = [
        'action', 'shooter', 'adventure', 'strategy', 'simulation', 'sports', 'racing', 'arcade',
        'board games', 'card', 'fighting', 'puzzle', 'platformer', 'RPG',
    ]
    ordering = dict(zip(positions, range(len(positions))))
    return sorted(genres, key=lambda x: ordering.get(x))


def get_stores(stores_json):
    results = []
    for store in stores_json:
        if store['store']['name'] == 'Epic Games':
            results.append('Epic Games Store')
        elif store['store']['name'] == 'Nintendo Store':
            results.append('Nintendo eShop')
        else:
            results.append(store['store']['name'])
    return results


def get_genres(genres_json):
    genres = []
    genres_pinned = ['educational', 'casual', 'family', 'indie']
    massive_multiplayer = 'massively multiplayer'

    game_genres_names = [g['name'].lower() for g in genres_json]

    if game_genres_names:
        for idx, genre in enumerate(game_genres_names):
            if genre == 'board games':
                game_genres_names[idx] = 'digital board'
            if genre == 'rpg':
                game_genres_names[idx] = 'RPG'

    game_genres_pinned = [name for name in game_genres_names if name in genres_pinned]
    game_genres_other = [name for name in game_genres_names if name not in (massive_multiplayer, *genres_pinned)]

    if any(game_genres_pinned):
        random_genre = int(hashlib.sha1(str(genres_json).encode()).hexdigest(), 16) % len(game_genres_pinned)
        genres.insert(0, game_genres_pinned[random_genre])

    if len(game_genres_other) == 1:
        genres.extend(game_genres_other)

    elif len(game_genres_other) == 2:
        genres = order_genres(genres)
        genres.append(
            f'{game_genres_other[0]}-{game_genres_other[1]}'
        )
    else:
        genres.extend(game_genres_other)

    if massive_multiplayer in game_genres_names:
        genres.insert(1, massive_multiplayer)

    return genres


def get_genres_simple(genres_json, lang):
    return [
        (genre.get(f'name_{lang}') or genre.get(f'name_{settings.LANGUAGE_RU}') or genre['name']).lower()
        for genre in genres_json
    ]


def games_auto_description(game):
    with translation.override(settings.LANGUAGE_EN):
        en = games_auto_description_en(game)
    with translation.override(settings.LANGUAGE_RU):
        ru = games_auto_description_ru(game)
    return {
        settings.LANGUAGE_EN: en,
        settings.LANGUAGE_RU: ru,
    }


def get_seo_fields(game):
    return {'similar_games': games_auto_description(game)}


def get_last_modified():
    return {'similar_games': now().strftime("%Y-%m-%dT%H:%M:%S")}


def games_auto_description_en(game):
    parts = {
        'general_info': {
            'general_section': '',
            'publishers_section': '',
            'metacritic_section': '',
            'rawg_rating_section': ''
        },
        'platforms_info': {
            'platforms_section': '',
            'stores_section': ''
        },
        'creators_info': {
            'producers_section': '',
            'directors_section': '',
            'composers_section': ''
        },
    }

    game_name = game.name

    genres = pluralize(get_genres(game.genres_json), for_genres=True) if game.genres_json else None
    platforms = pluralize([item['platform']['name'] for item in game.platforms_json]) if game.platforms_json else None

    developers = [item['name'] for item in game.developers_json] if game.developers_json else None
    if developers:
        if len(developers) > 3:
            developers = developers[:-1]
        developers = pluralize(developers)

    publishers = [item['name'] for item in game.publishers_json] if game.publishers_json else None
    if publishers:
        if len(publishers) > 3:
            publishers = publishers[:-1]
        publishers = pluralize(publishers, pick_one=True)

    stores = pluralize(get_stores(game.stores_json)) if game.stores_json else None

    release_date = game.released if (game.released and game.released.year != 1900) else None
    tba = game.tba

    metacritic = game.metacritic
    rawg_rating = dict(Review.RATINGS).get(game.rating_top).capitalize() if game.rating_top else None

    # Roles
    persons_qs = game.gameperson_set.visible()
    producers = persons_qs.filter(position__slug='producer').values_list('person__name', flat=True)
    directors = persons_qs.filter(position__slug='director').values_list('person__name', flat=True)
    composers = persons_qs.filter(position__slug='composer').values_list('person__name', flat=True)

    today = now().date()

    def hash_random(position):
        return int(hashlib.sha1(str(game.id).encode()).hexdigest()[position], 16) % 2 == 0

    # Intro
    if hash_random(0):
        intro_section = (
            f"Are you searching for games like {game_name}?"
            f" Look no further! Here's a list of games similar to {game_name}"
            f" either in the gameplay or in the visual style."
            f" If you like {game_name}, be sure to check some of these games as well."
        )
    else:
        intro_section = (
            f"If you want to find games like {game_name}, we've got you covered."
            f" This is a list of games similar to {game_name}."
            f" If you are looking for something like that, you'll likely enjoy some of these games."
        )
    intro = intro_section

    # General Info section
    general_section = f"{game_name}"
    if genres:
        vowels = ('a', 'e', 'i', 'o', 'u')
        general_section += f" is {'an' if genres[0].lower().startswith(vowels) else 'a'} {genres} game"
    else:
        general_section += f" is a game"
    if hash_random(1):
        if developers:
            general_section += f" developed by {developers}"
        general_section += "."
        if release_date and today > release_date:
            general_section += f" It was originally released in {release_date.year}."
        elif release_date and release_date > today:
            general_section += f" It is set to come out in {release_date.year}."
        elif not release_date or tba:
            f" The release date is to be announced."
    else:
        if developers:
            general_section += f" developed by {developers}"
        general_section += "."
        if release_date and today > release_date:
            general_section += f" It came out on {date(release_date)}."

    parts['general_info']['general_section'] = general_section

    # Publishers section
    if publishers and release_date:
        publishers_section = ''
        if hash_random(2):
            if today > release_date:
                publishers_section = f"It was published by {publishers}."
            elif tba or release_date > today:
                publishers_section = f"It is set to be published by {publishers}."
        else:
            if today > release_date:
                publishers_section = f"{publishers} published the game."
            elif release_date > today or tba:
                publishers_section = f"{publishers} will publish the game."

        parts['general_info']['publishers_section'] = publishers_section

    # Metacritic Section
    if metacritic:
        if hash_random(3):
            metacritic_section = f"On review aggregator Metacritic, {game_name} has a score of {metacritic}."
        else:
            metacritic_section = f"{game_name} has a Metascore of {metacritic}, based on professional reviews."

        parts['general_info']['metacritic_section'] = metacritic_section

    # Rating Section
    if rawg_rating:
        if hash_random(4):
            rawg_rating_section = f'Most users rated the game as "{rawg_rating}".'
        else:
            rawg_rating_section = f'The game is rated as "{rawg_rating}" on AG.'

        parts['general_info']['rawg_rating_section'] = rawg_rating_section

    # Platforms section
    if platforms:
        if hash_random(5):
            platforms_section = f"{game_name} is available on {platforms}."
        else:
            platforms_section = f"You can play {game_name} on {platforms}."

        parts['platforms_info']['platforms_section'] = platforms_section

    # Stores Section
    if stores:
        if hash_random(6):
            stores_section = f"The game is sold via {stores}."
        else:
            stores_section = f"You can purchase the game on {stores}."

        parts['platforms_info']['stores_section'] = stores_section

    # Producers Section
    if producers:
        values = pluralize(list(producers))
        if hash_random(7):
            producers_section = f"It was produced by {values}."
        else:
            producers_section = f"{values} produced the game."

        parts['creators_info']['producers_section'] = producers_section

    # Directors Section
    if directors:
        values = pluralize(list(directors))
        if hash_random(8):
            directors_section = f"It was directed by {values}."
        else:
            directors_section = f"{values} directed the game."

        parts['creators_info']['directors_section'] = directors_section

    # Composers Section
    if composers:
        values = pluralize(list(composers))
        if hash_random(9):
            composers_section = f"It was scored by {values}."
        else:
            composers_section = f"{values} scored the game."

        parts['creators_info']['composers_section'] = composers_section

    description = ''
    for _, part in parts.items():
        for _, section in part.items():
            if section:
                description += f'{section} '
        description += '\n'

    return {
        'intro': intro,
        'description': description
    }


def games_auto_description_ru(game):
    parts = {
        'general_info': {
            'general_section': '',
            'publishers_section': '',
            'metacritic_section': '',
            'rawg_rating_section': ''
        },
        'platforms_info': {
            'platforms_section': '',
            'stores_section': ''
        },
        'creators_info': {
            'producers_section': '',
            'directors_section': '',
            'composers_section': ''
        },
    }

    and_string = 'и'
    game_name = game.name
    release_date = game.released if game.is_released else None
    tba = game.tba
    metacritic = game.metacritic
    ru_ratings = {
        'exceptional': 'Шедевр',
        'recommended': 'Советую',
        'meh': 'Ну такое',
        'skip': 'Проходняк',
    }
    rawg_rating = ru_ratings[dict(Review.RATINGS).get(game.rating_top)] if game.rating_top else None
    today = now().date()

    def hash_random(position):
        return int(hashlib.sha1(str(game.id).encode()).hexdigest()[position], 16) % 2 == 0

    genres = []
    genres_str = ''
    if game.genres_json:
        genres = get_genres_simple(game.genres_json, settings.LANGUAGE_RU)
        genres_str = pluralize(genres, for_genres=False, and_string=and_string)
    platforms = []
    platforms_str = ''
    if game.platforms_json:
        platforms = [item['platform']['name'] for item in game.platforms_json]
        platforms_str = pluralize(platforms, and_string=and_string)
    developers = []
    developers_str = ''
    if game.developers_json:
        developers = [item['name'] for item in game.developers_json]
        if len(developers) > 3:
            developers = developers[:-1]
        developers_str = pluralize(developers, and_string=and_string)
    publishers = []
    publishers_str = ''
    if game.publishers_json:
        publishers = [item['name'] for item in game.publishers_json]
        if len(publishers) > 3:
            publishers = publishers[:-1]
        publishers_str = pluralize(publishers, pick_one=True, and_string=and_string)
    stores = []
    stores_str = ''
    if game.stores_json:
        stores = get_stores(game.stores_json)
        stores_str = pluralize(stores, and_string=and_string)

    # Roles
    persons_qs = game.gameperson_set.visible()
    producers = persons_qs.filter(position__slug='producer').values_list('person__name', flat=True)
    producer_gender = None
    if len(producers) == 1:
        producer_gender = persons_qs.filter(position__slug='producer').first().person.gender
    directors = persons_qs.filter(position__slug='director').values_list('person__name', flat=True)
    director_gender = None
    if len(directors) == 1:
        director_gender = persons_qs.filter(position__slug='director').first().person.gender
    composers = persons_qs.filter(position__slug='composer').values_list('person__name', flat=True)
    composer_gender = None
    if len(composers) == 1:
        composer_gender = persons_qs.filter(position__slug='composer').first().person.gender

    # Intro
    if hash_random(0):
        # Ищешь игры как [Game Name]? Ты в правильном месте!
        # Это топ игр, похожих на [Game Name] геймплеем или визуальным стилем.
        # Если тебе нравится [Game Name], то попробуй и эти игры тоже.
        intro_section = (
            f'Ищешь игры как {game_name}? Ты в правильном месте! '
            f'Это топ игр, похожих на {game_name} геймплеем или визуальным стилем. '
            f'Если тебе нравится {game_name}, то попробуй и эти игры тоже. '
        )
    else:
        # Если хочешь найти игры как [Game Name], то мы готовы помочь.
        # Посмотри эту подборку игр, похожих на [Game Name].
        # Если ищешь что-то похожее, то тебе скорее всего понравятся и эти игры.
        intro_section = (
            f'Если хочешь найти игры как {game_name}, то мы готовы помочь. '
            f'Посмотри эту подборку игр, похожих на {game_name}. '
            f'Если ищешь что-то похожее, то тебе скорее всего понравятся и эти игры. '
        )
    intro = intro_section

    # General Info section
    general_section = game_name
    # [Game Name] — это игра в жанре/жанрах [Genres], разработанная [Developer].
    if genres:
        general_section += f' — это игра в жанр{"е" if len(genres) == 1 else "ах"} {genres_str}'
    else:
        general_section += ' — это игра'
    if developers:
        general_section += f', разработанная {developers_str}'
    general_section += '. '
    if hash_random(1):
        # Она была выпущена в [Year]. / Она должна выйти в [Year]. / Дата релиза ещё не была объявлена.
        if release_date and today > release_date:
            general_section += f'Она была выпущена в {release_date.year}. '
        elif release_date and release_date > today:
            general_section += f'Она должна выйти в {release_date.year}. '
        elif not release_date or tba:
            f'Дата релиза ещё не была объявлена. '
    else:
        # Она вышла [Date+Year].
        if release_date and today > release_date:
            general_section += f'Она вышла {date(release_date)}. '
    parts['general_info']['general_section'] = general_section

    # Publishers section
    if publishers and release_date:
        publishers_section = ''
        if hash_random(2):
            # (if the year is available) Её издателем выступила компания [Publisher].
            # (if the year is not available) Издателем выступит [Publisher].
            if today > release_date:
                publishers_section = f'Её издателем выступила компания {publishers_str}. '
            elif tba or release_date > today:
                publishers_section = f'Издателем выступит {publishers_str}. '
        else:
            # (if the year is available) [Publisher] выступила издателем игры.
            # (if the year is not available) [Publisher] выступит издателем игры.
            if today > release_date:
                publishers_section = f'{publishers_str} выступила издателем игры.  '
            elif release_date > today or tba:
                publishers_section = f'{publishers_str} выступит издателем игры. '
        parts['general_info']['publishers_section'] = publishers_section

    # Metacritic Section
    if metacritic:
        if hash_random(3):
            # Согласно агрегатору рецензий Metacritic, у [Game Name] средний рейтинг [Number].
            metacritic_section = (
                f'Согласно агрегатору рецензий Metacritic, у {game_name} средний рейтинг {metacritic}. '
            )
        else:
            # Рейтинг [Game Name] на Metacritic составляет [Number].
            # Он расчитывается на основе профессиональных рецензий в СМИ.
            metacritic_section = (
                f"Рейтинг {game_name} на Metacritic составляет {metacritic}. "
                f"Он расчитывается на основе профессиональных рецензий в СМИ. "
            )
        parts['general_info']['metacritic_section'] = metacritic_section

    # Rating Section
    if rawg_rating:
        if hash_random(4):
            # Большинство пользователей AG оценивают игру как [rating].
            rawg_rating_section = f'Большинство пользователей AG оценивают игру как {rawg_rating}. '
        else:
            # Согласно нашим пользователям, самая популярная оценка игры — [Rating].
            rawg_rating_section = f'Согласно нашим пользователям, самая популярная оценка игры — {rawg_rating}. '
        parts['general_info']['rawg_rating_section'] = rawg_rating_section

    # Platforms section
    if platforms:
        if hash_random(5):
            # [Game Name] доступна на [Platforms].
            platforms_section = f'{game_name} доступна на {platforms_str}. '
        else:
            # В [Game Name] можно поиграть на [Platforms].
            platforms_section = f'{game_name} можно поиграть на {platforms_str}. '
        parts['platforms_info']['platforms_section'] = platforms_section

    # Stores Section
    if stores:
        if hash_random(6):
            # Игра продаётся в [Stores].
            stores_section = f'Игра продаётся в {stores_str}. '
        else:
            # Можно купить игру в [Stores].
            stores_section = f'Можно купить игру в  {stores_str}. '
        parts['platforms_info']['stores_section'] = stores_section

    # Producers Section
    if producers:
        values = pluralize(list(producers), and_string=and_string)
        if hash_random(7):
            # Игра была спродюссирована [Producer].
            producers_section = f'Игра была спродюссирована {values}. '
        else:
            # Продюсером/продюсерами игры выступил/выступила/выступили [Producer].
            producers_section = (
                f'Продюсер{"ом" if producer_gender else "ами"} игры '
                f'выступил{("а" if producer_gender == Person.GENDER_FEMALE else "") if producer_gender else "и"} '
                f'{values}. '
            )
        parts['creators_info']['producers_section'] = producers_section

    # Directors Section
    if directors:
        values = pluralize(list(directors), and_string=and_string)
        if hash_random(8):
            # Игра была срежиссирована [Director].
            directors_section = f'Игра была срежиссирована {values}. '
        else:
            # [Director] срежиссировал/срежиссировала/срежиссировали игру.
            directors_section = (
                f'{values} '
                f'срежиссировал{("а" if director_gender == Person.GENDER_FEMALE else "") if director_gender else "и"} '
                f'игру. '
            )
        parts['creators_info']['directors_section'] = directors_section

    # Composers Section
    if composers:
        values = pluralize(list(composers), and_string=and_string)
        if hash_random(9):
            # Музыка в игре была написана [Composer].
            composers_section = f'Музыка в игре была написана {values}. '
        else:
            # [Composer] написал/написала/написали музыку в игре.
            composers_section = (
                f'{values} '
                f'написал{("а" if composer_gender == Person.GENDER_FEMALE else "") if composer_gender else "и"} '
                f'музыку в игре. '
            )
        parts['creators_info']['composers_section'] = composers_section

    description = ''
    for _, part in parts.items():
        for _, section in part.items():
            if section:
                description += f'{section} '
        description += '\n'

    description_public = ''
    for _, part in parts.items():
        for key, section in part.items():
            if not section or key == 'rawg_rating_section':
                continue
            description_public += f'{section} '
        description_public += '\n'

    return {
        'intro': intro.replace('  ', ' '),
        'description': description.replace('  ', ' '),
        'description_public': description_public.replace('  ', ' '),
    }
