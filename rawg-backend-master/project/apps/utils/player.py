import datetime
import logging
import typing
import uuid

from django.conf import settings
from django.utils import timezone
from redis import Redis, exceptions


logger = logging.getLogger('redis')


class RedisGuestPlayerDataStorage:
    class DataNotFound(Exception):
        pass

    PLAYER_KEY = 'GUESTPLAYER:{player_id}'

    def __init__(self):
        self.redis_client = Redis.from_url(settings.REDIS_LOCATION)

    def _get_player_key(self, player_id: uuid.UUID) -> str:
        return self.PLAYER_KEY.format(player_id=player_id.hex)

    def create(self, player_id: uuid.UUID, expiry_date: datetime.datetime) -> None:
        success = self.redis_client.set(
            self._get_player_key(player_id),
            expiry_date.isoformat(),
            ex=max(0, (expiry_date - timezone.now()).seconds)
        )
        if not success:
            logger.error(f'ID is not registered in the database ({player_id.hex})')
            raise exceptions.RedisError('ID is not registered in the database')

    def exists(self, uid: uuid.UUID) -> bool:
        return bool(self.redis_client.exists(self._get_player_key(uid)))

    def get(self, uid: uuid.UUID) -> typing.Tuple[uuid.UUID, typing.Optional[str]]:
        date = self.redis_client.get(self._get_player_key(uid))
        if date is None:
            raise self.DataNotFound()
        return uid, date.decode()

    def list(self, uids: typing.Iterable[uuid.UUID]) -> typing.Iterator[typing.Tuple[uuid.UUID, typing.Optional[str]]]:
        for uid, date in zip(uids, self.redis_client.mget(map(self._get_player_key, uids))):
            if date is not None:
                yield uid, date.decode()
