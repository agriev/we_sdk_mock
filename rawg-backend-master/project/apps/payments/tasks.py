import json
import logging

import requests
from django.db import models
from requests.exceptions import RequestException

from apps.celery import app as celery
from apps.games.models import Game
from apps.utils.crypto import generate_signature

logger = logging.getLogger('payment')


@celery.task(bind=True, max_retries=72, retry_backoff=5, retry_jitter=True, retry_backoff_max=20*60,
             autoretry_for=(RequestException,))
def send_payment_to_game(self, payment_id):
    # retries timeouts: 5, 10, 20, 40, 80, 160, 320, 640, 1200, 1200, 1200 ... ends after 24 hours.
    from api.payments.serializers import PaymentReadSerializer
    from apps.payments.models import Payment
    try:
        payment = Payment.objects.client_data_annotated() \
            .annotate(url=models.F('game__webhook_url'), secret=models.F('game__secret_key')) \
            .get(id=payment_id)
        if payment.game_id is None:
            raise Game.DoesNotExist()
        if payment.data is None:
            raise ValueError()
    except Payment.DoesNotExist:
        logger.error(f'Failed to send payment data to game, payment not found. Payment id: {payment_id}')
    except Game.DoesNotExist:
        logger.error(f'Failed to send payment data to game, game not found. Payment id: {payment_id}')
    except ValueError:
        logger.error(f'Failed to send payment data to game, client data not found. Payment id: {payment_id}')
    else:
        if payment.url:
            try:
                _send_data_to_game(payment.url, payment.secret, PaymentReadSerializer(payment).data)
            except RequestException as error:
                logger.error(
                    f'Error while sending payment data to game developer. Payment id: {payment_id}. Error: {error}'
                )
                raise error


def _send_data_to_game(url: str, secret_key: str, data: dict) -> None:
    signature = generate_signature([json.dumps(data)], secret_key, '')
    headers = {'Authorization': f'Signature {signature}'}
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()
