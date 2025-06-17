from dataclasses import dataclass
from datetime import datetime
from typing import NewType

from aggregates.games import GameId

RedditId = NewType('RedditId', int)


@dataclass
class GameForReddit:
    id: GameId
    reddit_count: int


@dataclass
class Reddit:
    id: RedditId
    name: str
    text: str
    image: str
    url: str
    username: str
    username_url: str
    created: datetime
