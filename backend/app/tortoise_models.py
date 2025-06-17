from tortoise import fields
from tortoise.models import Model


class UserT(Model):
    id = fields.IntField(pk=True)
    username = fields.CharField(max_length=100, unique=True)
    email = fields.CharField(max_length=200, unique=True)
    password = fields.CharField(max_length=255)
    is_active = fields.BooleanField(default=True)
    is_admin = fields.BooleanField(default=False)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "user"
        ordering = ["-id"]


class GameT(Model):
    id = fields.IntField(pk=True)
    owner = fields.ForeignKeyField("models.UserT", related_name="games")
    title = fields.CharField(max_length=200)
    description = fields.TextField(null=True)
    file_path = fields.TextField()
    cover_url = fields.TextField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "game"
        ordering = ["-id"]


class PaymentT(Model):
    id = fields.IntField(pk=True)
    user = fields.ForeignKeyField("models.UserT", related_name="payments")
    game = fields.ForeignKeyField("models.GameT", related_name="payments")
    amount = fields.IntField()
    currency = fields.CharField(max_length=10, default="USD")
    status = fields.CharField(max_length=20, default="pending")
    provider_session_id = fields.CharField(max_length=255, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "payment"
        ordering = ["-id"] 