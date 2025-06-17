from django.conf import settings
from django.db import models
from django.utils.functional import cached_property
from knbauth import API
from papi.exceptions import OAuth2ClientNotFoundError

from apps.games.models import Game

papi_conf = settings.PAPI_OAUTH2_CONFIG
api = API(papi_conf['API_URL'], papi_conf['APP_ID'], papi_conf['SECRET'])


class Client(models.Model):
    papi_fields = ('name', 'client_id', 'client_secret', 'client_secret_expires_at', 'redirect_uris',
                   'client_id_issued_at', 'pic')
    read_only_papi_fields = ('client_id', 'client_id_issued_at')

    game = models.OneToOneField(Game, on_delete=models.PROTECT)
    client_id = models.CharField(max_length=255, unique=True)

    class Meta:
        verbose_name = 'OAuth2 client'
        verbose_name_plural = 'OAuth2 clients'

    @cached_property
    def info(self):
        if not self.client_id:
            return None
        return api.oauth2.get_client(client_id=self.client_id)

    def create_info(self, name, redirect_uris, client_secret_expires_at=None, pic=None):
        self.info = api.oauth2.create_client(
            name=name, redirect_uris=redirect_uris, client_secret_expires_at=client_secret_expires_at, pic=pic
        )

    def name_is_exists(self, name):
        try:
            api.oauth2.get_client_by_name(name=name)
            return True
        except OAuth2ClientNotFoundError:
            return False

    def update_info(self, client_id: str, **kwargs):
        self.info = api.oauth2.update_client(client_id=client_id, **kwargs)

    def delete(self, *args, **kwargs):
        try:
            api.oauth2.delete_client(client_id=self.client_id)
        except OAuth2ClientNotFoundError:
            pass

        return super().delete(*args, **kwargs)
