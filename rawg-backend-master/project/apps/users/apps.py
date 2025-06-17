from django.apps import AppConfig


class UsersConfig(AppConfig):
    DEFAUlT_GUEST_USERNAME_PATTERN = 'GuestPlayer_{player_id}'
    DEFAULT_GUEST_FULL_NAME = ''
    DEFAULT_GUEST_AVATAR = ''
    DEFAULT_GUEST_EMAIL = ''
    ADMIN_EXPORT_USER_FIELDS = ['email', 'full_name', 'date_joined', 'last_login']

    name = 'apps.users'
    verbose_name = 'Users'

    def ready(self):
        import apps.users.signals  # noqa:F401
