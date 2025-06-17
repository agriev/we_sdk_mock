from authlib.oauth2.rfc6749 import ResourceProtector as BaseResourceProtector
from authlib.oauth2.rfc6749.errors import UnsupportedTokenTypeError

from .validators import IntrospectTokenValidator


class ResourceProtector(BaseResourceProtector):
    def validate_request(self, scopes, request):
        # Token scope validation has been moved to permissions level
        validator, token_string = self.parse_request_authorization(request)
        validator.validate_request(request)
        token = validator.authenticate_token(token_string)
        self.update_token(validator, token)
        return token

    def update_token(self, validator, token):
        token.update(type=validator.TOKEN_TYPE)

    def validate_token(self, token, required_scope, request):
        if 'type' not in token:
            raise UnsupportedTokenTypeError(self._default_auth_type, self._default_realm)
        validator = self.get_token_validator(token['type'].lower())
        validator.validate_token(token, required_scope, request)


resource_protector = ResourceProtector()
resource_protector.register_token_validator(IntrospectTokenValidator())
