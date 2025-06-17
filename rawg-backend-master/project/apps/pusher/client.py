import pusher
from django.conf import settings

_client = None


def get_client():
    global _client
    if not _client:
        _client = pusher.Pusher(
            host=settings.PUSHER_HOST,
            port=settings.PUSHER_PORT,
            app_id=settings.PUSHER_APP_ID,
            key=settings.PUSHER_KEY,
            secret=settings.PUSHER_SECRET,
            ssl=False
        )
    return _client
