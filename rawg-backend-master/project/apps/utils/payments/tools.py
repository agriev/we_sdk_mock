from apps.payments.models import PaymentProject
from .exceptions import PaymentProjectNotConfigured


def get_project(game_id: int, payment_system_name: str) -> PaymentProject:
    try:
        return PaymentProject.objects.get(game_id=game_id, payment_system_name=payment_system_name)
    except PaymentProject.DoesNotExist as error:
        raise PaymentProjectNotConfigured(
            f'Payment system not configured for game (game_id: {game_id})'
        ) from error
