from django.conf import settings


def sync_mocks(games, user_id):
    from apps.games.models import Game
    from apps.mocks.models import Sync

    if settings.ENVIRONMENT == 'PRODUCTION':
        return games

    for instance in Sync.objects.filter(user_id=user_id):
        for row in instance.games.split('\n'):
            row = row.strip()
            if not row:
                continue
            try:
                kwargs = {'slug': row}
                if row.isdigit():
                    kwargs = {'id': row}
                game = Game.objects.get(**kwargs)
            except Game.DoesNotExist:
                continue
            games.append({'name': game.name})

    return games


def sync_mocks_clear(user_id):
    from apps.mocks.models import Sync

    if settings.ENVIRONMENT == 'PRODUCTION':
        return

    Sync.objects.filter(user_id=user_id).delete()
