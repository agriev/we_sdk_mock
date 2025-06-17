from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    is_active: bool = True
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Game(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    title: str = Field(index=True)
    description: str = Field(default="")
    file_path: str  # path to uploaded bundle
    cover_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Payment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    game_id: int = Field(foreign_key="game.id")
    amount: int  # in cents
    currency: str = Field(default="USD")
    status: str = Field(default="pending")  # pending, paid, failed
    provider_session_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow) 