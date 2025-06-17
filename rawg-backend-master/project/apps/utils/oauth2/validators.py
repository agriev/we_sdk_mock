import typing

from authlib.oauth2 import rfc7662
from authlib.oauth2.rfc6750.errors import InsufficientScopeError, InvalidTokenError
from knbauth import api
from rest_framework.request import Request


class IntrospectTokenValidator(rfc7662.IntrospectTokenValidator):
    def introspect_token(self, token_string: str) -> typing.Dict:
        return api.oauth2.introspect(token=token_string)

    def authenticate_token(self, token_string: str) -> typing.Dict:
        token = self.introspect_token(token_string)

        if not token or token['active'] is not True:
            raise InvalidTokenError(realm=self.realm, **self.extra_attributes)
        return token

    def validate_token(self, token: typing.Dict, scopes: typing.List, request: Request):
        if self.scope_insufficient(token.get('scope'), scopes):
            raise InsufficientScopeError()
