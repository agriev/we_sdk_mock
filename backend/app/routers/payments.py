from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..database import get_session
from ..models import Payment, User, Game
from .auth import get_current_user

router = APIRouter()


@router.post("/create", response_model=Payment)
async def create_payment(
    game_id: int,
    amount: int,
    currency: str = "USD",
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    payment = Payment(
        user_id=current_user.id,
        game_id=game_id,
        amount=amount,
        currency=currency,
    )
    session.add(payment)
    session.commit()
    session.refresh(payment)

    # TODO: integrate with real payment provider, update status accordingly

    return payment 