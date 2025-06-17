from authlib.oauth2.rfc6749.errors import MissingAuthorizationError, UnsupportedTokenTypeError
from authlib.oauth2.rfc6750.errors import InvalidTokenError
from knbauth.utils import api, get_or_create_user
from papi.exceptions import PAPIUserNotFoundError, PAPIValidationError
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

import logging
from .resource_protectors import resource_protector

logger = logging.getLogger(__name__)

class OAuth2Authentication(BaseAuthentication):
    protector = resource_protector
    keyword = resource_protector._default_auth_type

    def authenticate(self, request):
        try:
            token = resource_protector.validate_request([], request)
        except (UnsupportedTokenTypeError, MissingAuthorizationError, InvalidTokenError) as error:
            # FIXME: hack used for WWW-Authenticate header, think about how to use the authenticate_header method
            exc = AuthenticationFailed(error.error)
            request._www_header = self._full_authenticate_header(error)
            raise exc
        return self.authenticate_credentials(token)

    def authenticate_credentials(self, token):
        try:
            info = api.user.get_by_uid(uid=token['uid'])
        except (PAPIUserNotFoundError, PAPIValidationError) as error:
            logger.error(f'Non-existent uid in token (token: {token}, error: {error}).')
            raise AuthenticationFailed(InvalidTokenError.error)

        user = get_or_create_user(info)
        return user, token

    def authenticate_header(self, request):
        try:
            return request._www_header
        except AttributeError:
            if self.keyword:
                return self.keyword.capitalize()

    def _full_authenticate_header(self, error):
        try:
            headers = dict(error.get_headers())
            return headers['WWW-Authenticate'].capitalize()
        except (TypeError, ValueError, KeyError, AttributeError):
            return None
