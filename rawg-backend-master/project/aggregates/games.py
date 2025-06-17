from dataclasses import dataclass
from typing import NewType

GameId = NewType('GameId', int)


@dataclass
class Game:
    id: GameId
    reviews_text_count_all: int
    reviews_text_count: int
    collections_count_all: int
    collections_count: int
    discussions_count_all: int
    discussions_count: int
    parent_achievements_count_all: int
    parent_achievements_count: int
