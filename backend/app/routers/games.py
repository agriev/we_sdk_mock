from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, UploadFile
from sqlmodel import Session, select

from ..database import get_session
from ..models import Game, User
from .auth import get_current_user

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

router = APIRouter()


@router.get("/", response_model=List[Game])
def list_games(skip: int = 0, limit: int = 20, session: Session = Depends(get_session)):
    games = session.exec(select(Game).offset(skip).limit(limit)).all()
    return games


@router.post("/upload", response_model=Game)
async def upload_game(
    title: str,
    description: Optional[str] = "",
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Store file
    file_path = UPLOAD_DIR / file.filename
    with file_path.open("wb") as buffer:
        buffer.write(await file.read())

    game = Game(
        owner_id=current_user.id,
        title=title,
        description=description,
        file_path=str(file_path),
    )
    session.add(game)
    session.commit()
    session.refresh(game)
    return game 