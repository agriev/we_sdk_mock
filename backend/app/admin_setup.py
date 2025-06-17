import os

import aioredis
from fastapi_admin.app import app as admin_app
from fastapi_admin.providers.login import UsernamePasswordProvider
from tortoise import Tortoise

from .tortoise_models import UserT, GameT, PaymentT

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATABASE_URL = "sqlite://we_platform.db"
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")


async def init_admin() -> None:
    # Init Tortoise ORM
    await Tortoise.init(db_url=DATABASE_URL, modules={"models": ["app.tortoise_models"]})

    # Configure admin app
    redis = await aioredis.from_url(REDIS_URL, encoding="utf8", decode_responses=True)

    await admin_app.configure(
        logo_url="https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png",
        template_folders=[os.path.join(BASE_DIR, "templates")],
        providers=[UsernamePasswordProvider(admin_model=UserT)],
        redis=redis,
    )

    # Register resources dynamically
    from fastapi_admin.resources import Model

    class UserResource(Model):
        model = UserT
        label = "User"
        page_pre_title = "Users"
        page_title = "User"

    class GameResource(Model):
        model = GameT
        label = "Game"

    class PaymentResource(Model):
        model = PaymentT
        label = "Payment"

    admin_app.register(UserResource)
    admin_app.register(GameResource)
    admin_app.register(PaymentResource) 