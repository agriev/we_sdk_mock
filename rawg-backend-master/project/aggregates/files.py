from collections import OrderedDict
from dataclasses import dataclass
from typing import NewType

from aggregates.games import GameId
from apps.utils.mapper_patched import Translated

CheatCodeId = NewType('CheatCodeId', int)


@dataclass
class GameForCheatCode:
    id: GameId
    files_count: dict


@dataclass
class CheatCode:
    id: CheatCodeId
    category: dict
    description: str
    url: str
    attrs: OrderedDict
    number: int


@dataclass
class GameForCheatCodeExpanded:
    id: GameId
    name: Translated
    slug: str
    files_count: dict


@dataclass
class CheatCodeExpanded(CheatCode):
    game: GameForCheatCodeExpanded
