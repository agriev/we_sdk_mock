import hashlib

from django.db.models import Q
from django.utils import translation
from django.utils.timezone import now

from apps.common.seo import pluralize
from apps.credits.models import GamePerson, Person, Position
from apps.games.models import Developer, Game


def _data(creator):
    game_person_qs = GamePerson.objects.visible().prefetch_related('person', 'position').filter(person=creator)
    if not game_person_qs.count():
        return False

    # Creator
    last_name = creator.visible_name.strip().split().pop()

    # Games
    all_games = Game.objects.only_short('released').only().order_by('released').filter(
        id__in=creator.gameperson_set.values_list('game_id', flat=True)
    )
    top_games = all_games.order_by('-added')
    released_games = all_games.filter(released__year__gte=1900, released__lte=now(), tba=False).order_by('released')
    future_games = all_games.filter(Q(released__gt=now()) | Q(tba=True))

    top_game = top_games.first()
    first_game, second_game, subsequent_games, last_game, future_game, subseq_game = None, None, None, None, None, None
    released_games_count = released_games.count()
    if released_games_count:
        first_game = released_games.first()
        exclude = [first_game.id]
        if released_games_count > 1:
            second_game = released_games[1]
            exclude.append(second_game.id)
        if released_games_count > 2 and last_game != second_game:
            last_game = released_games.last()
            exclude.append(last_game.id)
        subsequent_games = released_games.exclude(id__in=exclude).order_by('-added')
    if future_games.count():
        random_game = int(hashlib.sha1(str(creator.id).encode()).hexdigest(), 16) % future_games.count()
        future_game = future_games[random_game]
    if subsequent_games and subsequent_games.count():
        random_game = int(hashlib.sha1(str(creator.id).encode()).hexdigest(), 16) % subsequent_games.count()
        subseq_game = subsequent_games[random_game]

    # Roles
    all_roles_ids = set(list(game_person_qs.values_list('position', flat=True)))
    roles = Position.objects.filter(id__in=all_roles_ids)
    top_game_role = top_game.gameperson_set.filter(person=creator).first().position
    first_game_role = None
    if first_game:
        first_game_role = first_game.gameperson_set.filter(person=creator).first().position
    second_game_role = None
    if second_game:
        second_game_role = second_game.gameperson_set.filter(person=creator).first().position
    future_game_role = None
    if future_game:
        future_game_role = future_game.gameperson_set.filter(person=creator).first().position

    # Random
    def hash_random(position):
        return int(hashlib.sha1(str(creator.id).encode()).hexdigest()[position], 16) % 3

    return (
        last_name,
        top_game, first_game, second_game, last_game, subseq_game, future_game,
        all_games, subsequent_games, top_games, future_games,
        roles, top_game_role, first_game_role, second_game_role, future_game_role,
        hash_random
    )


def generate_auto_description_en(creator: Person) -> str:
    with translation.override('en'):
        return _generate_auto_description_en(creator)


def _generate_auto_description_en(creator: Person) -> str:
    data = _data(creator)
    if data is False:
        return ''
    (
        last_name,
        top_game, first_game, second_game, last_game, subseq_game, future_game,
        all_games, subsequent_games, top_games, future_games,
        roles, top_game_role, first_game_role, second_game_role, future_game_role,
        hash_random
    ) = data

    description = []

    # Intro section
    roles_str = pluralize(list(roles.values_list('name', flat=True)))
    if not first_game:
        # [Creator's Full Name] is a games [Development Roles]. [Creator's Last Name] is perhaps best known as
        # the [Development Role] of [Most Popular Games].
        intro_section = f'{creator.visible_name} is a games {roles_str}.'
        if top_game not in future_games.values_list('name', flat=True):
            intro_section += f'{last_name} is perhaps best known as the {top_game_role} of {top_game.name}. '
    else:
        top_developers_ids = filter(
            None,
            all_games
            .filter(id__in=creator.gameperson_set.values_list('game_id', flat=True))
            .values_list('developers', flat=True)
        )
        top_developers_str = pluralize(
            list(Developer.objects.filter(id__in=top_developers_ids).values_list('name', flat=True))
        )
        if top_developers_str:
            # [Creator's Full Name] is a games [Development Roles] who started the games industry career in
            # [the year of the first game]. Since then, [Creator's Last Name] has been working with
            # [Game Developers of the Most Popular Games].
            intro_section = f'{creator.visible_name} is a games {roles_str}'
            if not first_game.is_released:
                intro_section += f' who started the games industry career in {first_game.released.year}. '
                intro_section += f'Since then, {last_name} has been working with {top_developers_str}. '
            else:
                intro_section += f'. {last_name} has been working with {top_developers_str}. '
        else:
            # [Creator's Full Name] has been working in the games industry since [the year of the first game].
            # [Creator's Last Name] is known for working on [Most Popular Games] as the games [Development Roles].
            top_games_str = pluralize(top_games.values_list('name', flat=True))
            intro_section = (
                f'{creator.visible_name} has been working in the games industry since {first_game.released.year}. '
                f'{last_name} is known for working on {top_games_str} as the games {roles_str}. '
            )
    description.append(intro_section)

    # First game section
    if first_game:
        option = hash_random(0)
        if option == 1:
            # [Creator's Last Name]'s first game was [First Game] published by [Publisher] for [Platforms] in [Year].
            first_game_section = f"{last_name}'s first game was {first_game.name}"
            publisher = first_game.publishers.first()
            if publisher:
                first_game_section += f' published by {publisher.name}'
            platforms_str = pluralize(list(first_game.platforms.values_list('name', flat=True))[:4])
            if platforms_str:
                first_game_section += f' for {platforms_str}'
            if first_game.is_released:
                first_game_section += f' in {first_game.released.year}. '
            if not first_game_section.endswith('. '):
                first_game_section += '. '
        elif option == 2:
            # [Creator's Last Name] started in [Year] as the [Development Role] of [First Game].
            first_game_section = f'{last_name} started'
            if first_game.is_released:
                first_game_section += f' in {first_game.released.year}'
            first_game_section += f' as the {first_game_role.name} of {first_game.name}. '
        else:
            # [Creator's Last Name]'s first published game was [First Game] released in [Year].
            first_game_section = f"{last_name}'s first published game was {first_game.name}"
            if first_game.is_released:
                first_game_section += f' released in {first_game.released.year}. '
            else:
                first_game_section += '. '
        description.append(first_game_section)

    # Second game section
    if second_game:
        option = hash_random(1)
        if option == 1:
            # Then, [Creator's Full Name] went on to work on [Second Game] as the [Development Role].
            second_game_section = (
                f'Then, {creator.visible_name} went on to work on {second_game.name} as the {second_game_role.name}. '
            )
        elif option == 2:
            # After that, [Creator's Full Name] took part as the [Development Role] of [Second Game].
            second_game_section = (
                f'After that, {creator.visible_name} took part as the {second_game_role.name} of {second_game.name}. '
            )
        else:
            # Next, [Creator's Full Name] worked on [Second Game] taking on the role of [Development Role].
            second_game_section = (
                f'Next, {creator.visible_name} worked on {second_game.name} '
                f'taking on the role of {second_game_role.name}. '
            )
        description.append(second_game_section)

    # Subsequent games section
    if subseq_game:
        option = hash_random(2)
        platforms_str = pluralize(list(subseq_game.platforms.values_list('name', flat=True))[:4])
        developer = subseq_game.developers.first()
        publisher = subseq_game.publishers.first()
        if developer and option == 1:
            # Afterwards, [Creator's Last Name] worked on [Game] developed by [Developer] in [Year].
            subseq_section = (
                f'Afterwards, {creator.visible_name} worked on {subseq_game.name} '
                f'developed by {developer.name} in {subseq_game.released.year}. '
            )
        elif publisher and option == 2:
            # Later, [Creator's Last Name] also was part of the team who developed [Game] published by
            # [Publisher] for [Platforms].
            subseq_section = f'Later, {last_name} also was part of the team who developed {subseq_game.name}'
            if platforms_str:
                subseq_section += f' published by {publisher.name} for {platforms_str}'
            subseq_section += '. '
        else:
            # [Creator's Last Name] also worked on [Game] developed by [Developer] for [Platforms].
            subseq_section = f'{last_name} also worked on {subseq_game.name}'
            if developer:
                subseq_section += f' developed by {developer.name}'
            if platforms_str:
                subseq_section += f' for {platforms_str}'
            subseq_section += '. '
        description.append(subseq_section)

    # Final game section
    if last_game:
        option = hash_random(3)
        if option == 1:
            # Most recently, [Creator's Full Name] was involved in the development of [Last Game].
            final_game_section = (
                f'Most recently, {creator.visible_name} was involved in the development of {last_game.name}. '
            )
        elif option == 2:
            # The latest work of [Creator's Full Name] was [Last Game], published in [Year].
            final_game_section = (
                f'The latest work of {creator.visible_name} was {last_game.name}, '
                f'published in {last_game.released.year}.'
            )
        else:
            # Most lately, [Creator's Full Name] worked on [Last Game].
            final_game_section = f'Most lately, {creator.visible_name} worked on {last_game.name}.'
        description.append(final_game_section)

    # Work in progress game section
    if future_game:
        option = hash_random(4)
        developer = future_game.developers.first()
        if option == 1:
            # Currently, [Creator's Last Name] is developing [Future Game] with [Developer].
            # It is set to release in [Year (if available)].
            # The release date is yet to be announced (if Year is not available).
            future_game_section = f'Currently, {last_name} is developing {future_game.name}'
            if developer:
                future_game_section += f' with {developer.name}. '
            else:
                future_game_section += f'. '
            if future_game.is_released:
                future_game_section += f'It is set to release in {future_game.released.year}. '
            else:
                future_game_section += 'The release date is yet to be announced. '
        elif option == 2:
            # Now, [Creator's Last Name] has joined the team of [Future Game] as the [Development Role].
            future_game_section = (
                f'Now, {last_name} has joined the team of {future_game.name} as the {future_game_role.name}. '
            )
        else:
            # At the moment, [Creator's Last Name] is working with [Developer] on [Future Game],
            # which was announced for [Platforms].
            future_game_section = f'At the moment, {last_name} is working'
            if developer:
                future_game_section += f' with {developer.name}'
            future_game_section += f' on {future_game.name}'
            platforms_str = pluralize(list(future_game.platforms.values_list('name', flat=True))[:4])
            if platforms_str:
                future_game_section += f', which was announced for {platforms_str}. '
            else:
                future_game_section += '. '
        description.append(future_game_section)

    return ' '.join(description).replace('  ', ' ')


def generate_auto_description_ru(creator: Person) -> str:
    with translation.override('ru'):
        return _generate_auto_description_ru(creator)


def _generate_auto_description_ru(creator: Person) -> str:
    data = _data(creator)
    if data is False:
        return ''
    (
        last_name,
        top_game, first_game, second_game, last_game, subseq_game, future_game,
        all_games, subsequent_games, top_games, future_games,
        roles, top_game_role, first_game_role, second_game_role, future_game_role,
        hash_random
    ) = data

    description = []
    and_string = 'и'
    female = creator.gender == Person.GENDER_FEMALE

    # Intro section
    roles_str = pluralize(list(roles.values_list('name', flat=True)), and_string=and_string)
    roles_genitive_str = pluralize(list(roles.values_list('name_ru_genitive', flat=True)), and_string=and_string)
    if not first_game:
        # [Creator's Full Name] — [Development Roles] видеоигр. [Creator's Last Name], пожалуй, больше всего
        # известен как [Development Role] игры [Most Popular Games].
        intro_section = f'{creator.visible_name} — {roles_str} видеоигр. '
        if top_game.name not in future_games.values_list('name', flat=True):
            intro_section += (
                f'{last_name}, пожалуй, больше всего извест{"на" if female else "ен"} как '
                f'{top_game_role.name} игры {top_game.name}. '
            )
    else:
        top_developers_ids = filter(
            None,
            all_games
            .filter(id__in=creator.gameperson_set.values_list('game_id', flat=True))
            .values_list('developers', flat=True)
        )
        top_developers_str = pluralize(
            list(Developer.objects.filter(id__in=top_developers_ids).values_list('name', flat=True)),
            and_string=and_string
        )
        if top_developers_str:
            # [Creator's Full Name] — [Development Roles] видеоигр. Он начал свою карьеру в индустрии в
            # [the year of the first game] году. С тех пор [Creator's Last Name] успел поработать с
            # [Game Developers of the Most Popular Games].
            intro_section = f'{creator.visible_name} — {roles_str} видеоигр. '
            if first_game.is_released:
                intro_section += (
                    f'Он{"а" if female else ""} начал{"а" if female else ""} свою карьеру в индустрии в '
                    f'{first_game.released.year}. '
                    f'С тех пор {last_name} успел{"а" if female else ""} поработать с {top_developers_str}. '
                )
            else:
                intro_section += f'{last_name} успел{"а" if female else ""} поработать с {top_developers_str}. '
        else:
            # [Creator's Full Name] работает в видеоигровой индустрии с [the year of the first game].
            # [Creator's Last Name] известен за работу над [Most Popular Games] в качестве [Development Roles].
            top_games_str = pluralize(top_games.values_list('name', flat=True), and_string=and_string)
            intro_section = (
                f'{creator.visible_name} работает в видеоигровой индустрии с {first_game.released.year}. '
                f'{last_name} извест{"на" if female else "ен"} за работу над {top_games_str} '
                f'в качестве {roles_genitive_str}. '
            )
    description.append(intro_section)

    # First game section
    if first_game:
        option = hash_random(0)
        if option == 1:
            # [Creator's Last Name] поучаствовал в первом проекте в [Year].
            # Это была игра [First Game], изданная [Publisher] для [Platforms].
            first_game_section = f'{last_name} поучаствовал{"а" if female else ""} в первом проекте '
            if first_game.is_released:
                first_game_section += f' в {first_game.released.year}. '
            else:
                first_game_section += ' в недавнее время. '
            first_game_section += f'Это была игра {first_game.name}'
            publisher = first_game.publishers.first()
            if publisher:
                first_game_section += f', изданная {publisher.name}'
            platforms_str = pluralize(
                list(first_game.platforms.values_list('name', flat=True))[:4],
                and_string=and_string
            )
            if platforms_str:
                first_game_section += f' для {platforms_str}'
            first_game_section += '. '
        elif option == 2:
            # [Creator's Last Name] начал карьеру в геймдеве в [Year] в качестве [Development Role] игры [First Game].
            first_game_section = f'{last_name} начал{"а" if female else ""} карьеру в геймдеве '
            if first_game.is_released:
                first_game_section += f'в {first_game.released.year} '
            first_game_section += f'в качестве {first_game_role.name_ru_genitive} игры {first_game.name}. '
        else:
            # Первой игрой для него стала [First Game], выпущенная в [Year].
            first_game_section = f'Первой игрой для {"неё" if female else "него"} стала {first_game.name}'
            if first_game.is_released:
                first_game_section += f', выпущенная в {first_game.released.year}. '
            else:
                first_game_section += '. '
        description.append(first_game_section)

    # Second game section
    if second_game:
        option = hash_random(1)
        if option == 1:
            # Затем [Creator's Full Name] работал над [Second Game] в качестве [Development Role].
            second_game_section = (
                f'Затем {creator.visible_name} работал{"а" if female else ""} '
                f'над {second_game.name} в качестве {second_game_role.name_ru_genitive}. '
            )
        elif option == 2:
            # После этого [Creator's Full Name] принял участие в качестве [Development Role]
            # в работе над [Second Game].
            second_game_section = (
                f'После этого {creator.visible_name} принял{"а" if female else ""} участие в качестве '
                f'{second_game_role.name_ru_genitive} в работе над {second_game.name}. '
            )
        else:
            # Следующей работой стала [Second Game], где [Creator's Full Name] занял позицию [Development Role].
            second_game_section = (
                f'Следующей работой стала {second_game.name}, где {creator.visible_name} '
                f'занял{"а" if female else ""} позицию {second_game_role.name_ru_genitive}. '
            )
        description.append(second_game_section)

    # Subsequent games section
    if subseq_game:
        option = hash_random(2)
        platforms_str = pluralize(
            list(subseq_game.platforms.values_list('name', flat=True))[:4],
            and_string=and_string
        )
        developer = subseq_game.developers.first()
        publisher = subseq_game.publishers.first()
        if developer and option == 1:
            # Впоследствии [Creator's Last Name] работал над [Game], разработанной [Developer] в [Year].
            subseq_section = (
                f'Впоследствии {creator.visible_name} работал{"а" if female else ""} над {subseq_game.name}, '
                f'разработанной {developer.name} в {subseq_game.released.year}. '
            )
        elif publisher and option == 2:
            # После чего [Creator's Last Name] также принял участие в разработке [Game],
            # изданной [Publisher] на [Platforms].
            subseq_section = (
                f'После чего {last_name} также принял{"а" if female else ""} участие в разработке {subseq_game.name}'
            )
            if platforms_str:
                subseq_section += f', изданной {publisher.name} на {platforms_str}'
            subseq_section += '. '
        else:
            # [Creator's Last Name] был частью команды [Game]. Её разработала компания [Developer] для [Platforms].
            subseq_section = f'{last_name} был{"а" if female else ""} частью команды {subseq_game.name}. '
            if developer:
                subseq_section += f'Её разработала компания {developer.name}'
            if platforms_str:
                subseq_section += f' для {platforms_str}'
            subseq_section += '. '
        description.append(subseq_section)

    # Final game section
    if last_game:
        option = hash_random(3)
        if option == 1:
            # Последней выпущенной работой стала [Last Game], где [Creator's Full Name] также принял участие.
            final_game_section = (
                f'Последней выпущенной работой стала {last_game.name}, где {creator.visible_name} '
                f'также принял{"а" if female else ""} участие. '
            )
        elif option == 2:
            # Из последних работ можно упомянуть [Last Game], выпущенную в [Year].
            final_game_section = (
                f'Из последних работ можно упомянуть {last_game.name}, выпущенную в {last_game.released.year}. '
            )
        else:
            # [Creator's Full Name] работал над [Last Game] в [Year]. На данный момент это его последний проект.
            final_game_section = f'{creator.visible_name} работал{"а" if female else ""} над {last_game.name}'
            if last_game.is_released:
                final_game_section += f' в {last_game.released.year}'
            final_game_section += f'. На данный момент это {"её" if female else "его"} последний проект. '
        description.append(final_game_section)

    # Work in progress game section
    if future_game:
        option = hash_random(4)
        if option == 1:
            # Сейчас [Creator's Last Name] разрабатывает [Future Game] вместе с [Developer]. Игра должна выйти
            # в [Year (if available)]. О дате релиза пока не было объявлено (if Year is not available).
            future_game_section = f'Сейчас {last_name} разрабатывает {future_game.name}'
            developer = future_game.developers.first()
            if developer:
                future_game_section += f' вместе с {developer.name}. '
            else:
                future_game_section += '. '
            if future_game.is_released:
                future_game_section += f'Игра должна выйти в {future_game.released.year}. '
            else:
                future_game_section += 'О дате релиза пока не было объявлено. '
        elif option == 2:
            # [Creator's Last Name] присоединился к команде разработки [Future Game] на позиции [Development Role].
            future_game_section = (
                f'{last_name} присоединил{"ась" if female else "ся"} к команде разработки '
                f'{future_game.name} на позиции {future_game_role.name_ru_genitive}. '
            )
        else:
            # В данный момент [Creator's Last Name] работает с [Developer] над [Future Game].
            # Игра должна выйти на [Platforms].
            future_game_section = f'В данный момент {last_name} работает'
            developer = future_game.developers.first()
            if developer:
                future_game_section += f' с {developer.name}'
            future_game_section += f' над {future_game.name}. '
            platforms_str = pluralize(
                list(future_game.platforms.values_list('name', flat=True))[:4],
                and_string=and_string
            )
            if platforms_str:
                future_game_section += f'Игра должна выйти на {platforms_str}. '
        description.append(future_game_section)

    return ' '.join(description).replace('  ', ' ')
