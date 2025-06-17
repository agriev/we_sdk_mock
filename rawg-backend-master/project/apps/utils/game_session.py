import abc
import typing
import uuid
from dataclasses import dataclass, field
from datetime import datetime

from django.apps import apps
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from django.utils.dateparse import parse_datetime as parse
from pottery import RedisDict
from redis import Redis

from apps.games.models import Game, PlayerGameSession as PlayerGameSessionModel, generate_game_sid
from apps.users.models import PlayerType
from apps.utils.crypto import check_signature, generate_signature


@dataclass
class CommonPlayerGameSessionData:
    game: Game
    player: PlayerType
    game_sid: str
    created: datetime
    _created: datetime = field(init=False, repr=False)

    @property
    def created(self) -> datetime:
        return self._created

    @created.setter
    def created(self, value: typing.Union[datetime, str]):
        if isinstance(value, str):
            value = parse(value)
        self._created = value


class AbstractStorageClassBase(metaclass=abc.ABCMeta):
    @abc.abstractmethod
    def exists(self, game: Game, player: PlayerType) -> bool:
        ...

    @abc.abstractmethod
    def get(self, game: Game, player: PlayerType) -> CommonPlayerGameSessionData:
        ...

    @abc.abstractmethod
    def all(self, player: PlayerType) -> typing.Iterator[CommonPlayerGameSessionData]:
        ...

    @abc.abstractmethod
    def create(self, game: Game, player: PlayerType) -> CommonPlayerGameSessionData:
        ...

    @abc.abstractmethod
    def create_many(self, player: PlayerType, datums: typing.Iterable[CommonPlayerGameSessionData]):
        ...

    @abc.abstractmethod
    def delete(self, game: Game, player: PlayerType) -> None:
        ...

    @abc.abstractmethod
    def delete_all(self, player: PlayerType) -> None:
        ...


StorageType = typing.TypeVar('StorageType', bound=AbstractStorageClassBase)


class RedisStorage(AbstractStorageClassBase):
    GAME_SESSIONS_KEY_TPL = 'gamesessions:{player_id}'

    def __init__(self, redis_client: Redis):
        self._redis = redis_client

    def exists(self, game: Game, player: PlayerType) -> bool:
        return self._redis.hexists(
            self._get_redis_game_sessions_key(player),
            self._get_game_key(game)
        )

    def get(self, game: Game, player: PlayerType) -> CommonPlayerGameSessionData:
        game_sessions = self._get_game_sessions(player)
        try:
            game_sid, created_str = game_sessions[self._get_game_key(game)]
        except KeyError:
            raise ObjectDoesNotExist
        return CommonPlayerGameSessionData(
            game=game,
            player=player,
            game_sid=game_sid,
            created=created_str
        )

    def all(self, player: PlayerType) -> typing.Iterator[CommonPlayerGameSessionData]:
        game_sessions = self._get_game_sessions(player).to_dict()
        pk_to_game_map = Game.objects.in_bulk(game_sessions.keys())
        for game_pk, (game_sid, created_str) in game_sessions.items():
            try:
                game = pk_to_game_map[game_pk]
            except KeyError:
                continue
            yield CommonPlayerGameSessionData(
                game=game,
                player=player,
                game_sid=game_sid,
                created=created_str
            )

    def create(self, game: Game, player: PlayerType) -> CommonPlayerGameSessionData:
        game_sessions = self._get_game_sessions(player)
        game_sid, created_str = game_sessions.setdefault(
            self._get_game_key(game),
            [generate_game_sid(), timezone.now().isoformat()]
        )
        data = CommonPlayerGameSessionData(
            game=game,
            player=player,
            game_sid=game_sid,
            created=created_str
        )
        return data

    def create_many(self, player: PlayerType, datums: typing.Iterable[CommonPlayerGameSessionData]):
        raise NotImplementedError

    def delete(self, game: Game, player: PlayerType) -> None:
        try:
            game_sessions = self._get_game_sessions(player)
            del game_sessions[self._get_game_key(game)]
        except KeyError:
            pass

    def delete_all(self, player: PlayerType) -> None:
        self._redis.delete(self._get_redis_game_sessions_key(player))

    def _get_game_key(self, game: Game) -> int:
        return game.pk

    def _get_redis_game_sessions_key(self, player: PlayerType) -> str:
        return self.GAME_SESSIONS_KEY_TPL.format(player_id=player.id.hex)

    def _get_game_sessions(self, player: PlayerType) -> RedisDict:
        key = self._get_redis_game_sessions_key(player)
        redis_dict = RedisDict(redis=self._redis, key=key)
        if player.expiry_age:
            self._redis.expire(key, player.expiry_age)
        return redis_dict


class DatabaseStorage(AbstractStorageClassBase):
    def exists(self, game: Game, player: PlayerType) -> bool:
        return PlayerGameSessionModel.objects.filter(game=game, player_id=player.id).exists()

    def get(self, game: Game, player: PlayerType) -> CommonPlayerGameSessionData:
        instance = PlayerGameSessionModel.objects.get(game=game, player_id=player.id)
        return CommonPlayerGameSessionData(
            game=game,
            player=player,
            game_sid=instance.game_sid,
            created=instance.created
        )

    def all(self, player: PlayerType) -> typing.Iterator[CommonPlayerGameSessionData]:
        for instance in PlayerGameSessionModel.objects.filter(player_id=player.id).select_related('game'):
            yield CommonPlayerGameSessionData(
                game=instance.game,
                player=player,
                game_sid=instance.game_sid,
                created=instance.created
            )

    def create(self, game: Game, player: PlayerType) -> CommonPlayerGameSessionData:
        instance, _ = PlayerGameSessionModel.objects.get_or_create(game=game, player_id=player.id)
        return CommonPlayerGameSessionData(
            game=game,
            player=player,
            game_sid=instance.game_sid,
            created=instance.created
        )

    def create_many(self, player: PlayerType, datums: typing.Iterable[CommonPlayerGameSessionData]):
        PlayerGameSessionModel.objects.bulk_create(
            [
                PlayerGameSessionModel(
                    game=datum.game,
                    player_id=player.id,
                    game_sid=datum.game_sid,
                    created=datum.created
                )
                for datum in datums
            ],
            ignore_conflicts=True
        )

    def delete(self, game: Game, player: PlayerType) -> None:
        PlayerGameSessionModel.objects.filter(game=game, player_id=player.id).delete()

    def delete_all(self, player: PlayerType) -> None:
        PlayerGameSessionModel.objects.filter(player_id=player.id).delete()


class PlayerGameSessionController:
    def _get_storage(self, player: PlayerType) -> StorageType:
        return DatabaseStorage() if player.is_persistent else RedisStorage(Redis.from_url(settings.REDIS_LOCATION))

    def session_exists(self, game: Game, player: PlayerType) -> bool:
        storage = self._get_storage(player)
        return storage.exists(game, player)

    def get_session(self, game: Game, player: PlayerType) -> CommonPlayerGameSessionData:
        storage = self._get_storage(player)
        try:
            return storage.get(game, player)
        except ObjectDoesNotExist:
            return storage.create(game, player)

    def get_all_sessions(self, player: PlayerType) -> typing.List[CommonPlayerGameSessionData]:
        return list(self._get_storage(player).all(player))

    def copy_between_players(self, source_player: PlayerType, destination_player: PlayerType, clear_source=False):
        source_storage = self._get_storage(source_player)
        destination_storage = self._get_storage(destination_player)
        destination_storage.create_many(player=destination_player, datums=source_storage.all(source_player))
        if clear_source:
            source_storage.delete_all(source_player)

    @staticmethod
    def make_auth_key(session: CommonPlayerGameSessionData) -> str:
        chunks = (str(session.game.pk), session.player.id.hex, session.game_sid)
        return generate_signature(chunks, session.game.secret_key)

    @classmethod
    def validate_auth_key(cls, auth_key: str, session: CommonPlayerGameSessionData) -> bool:
        chunks = (str(session.game.pk), session.player.id.hex, session.game_sid)
        return check_signature(auth_key, chunks, session.game.secret_key)


class PlayHistory:
    PLAYED_HISTORY_KEY_TPL = 'played_history:{player_id}'
    SIZE = apps.get_app_config('games').PLAYED_HISTORY_SIZE

    def __init__(self):
        self.client = Redis.from_url(settings.REDIS_LOCATION)

    def _get_history_key(self, player_uid: uuid.UUID) -> str:
        return self.PLAYED_HISTORY_KEY_TPL.format(player_id=player_uid.hex)

    def add(self, game_id: int, player_uid: uuid.UUID, expiry_date: datetime = None) -> None:
        key = self._get_history_key(player_uid)
        pipeline = self.client.pipeline()
        pipeline.zadd(key, {str(game_id): timezone.now().timestamp()})
        pipeline.zremrangebyrank(key, 0, -self.SIZE - 1)
        if expiry_date:
            pipeline.expire(key, max(0, (expiry_date - timezone.now()).seconds))
        pipeline.execute()

    def list(self, player_uid: uuid.UUID) -> typing.List[int]:
        return [
            int(pk.decode()) for pk in self.client.zrevrange(self._get_history_key(player_uid), 0, self.SIZE)
        ]
