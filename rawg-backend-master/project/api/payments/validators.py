from rest_framework import serializers

from apps.games.models import Game
from apps.payments.models import PaymentProject
from apps.users.models import AuthenticatedPlayer


def player_exists(player_id: str) -> None:
    try:
        player_uid = AuthenticatedPlayer.validate_id(player_id)
    except AuthenticatedPlayer.InvalidIdError as e:
        raise serializers.ValidationError(f'Invalid player id - {str(e)}')
    if not AuthenticatedPlayer.exists(player_uid):
        raise serializers.ValidationError('Player not found')


def project_exists(project_id: int, payment_system_name: str) -> None:
    if not PaymentProject.objects.filter(id=project_id, payment_system_name=payment_system_name).exists():
        raise serializers.ValidationError(f'Project with id "{project_id}" not found')


def game_exists(game_id: int) -> None:
    if not Game.objects.filter(id=game_id).exists():
        raise serializers.ValidationError(f'Game with id "{game_id}" not found')
