from authlib.oauth2.rfc6750.errors import InsufficientScopeError
from django.core.exceptions import ImproperlyConfigured
from rest_framework.permissions import BasePermission

from .resource_protectors import resource_protector


class TokenHasScope(BasePermission):
    message = InsufficientScopeError.error

    def get_scopes(self, view):
        try:
            return getattr(view, "required_scopes")
        except AttributeError:
            raise ImproperlyConfigured("TokenHasScope requires the view to define the required_scopes attribute")

    def has_permission(self, request, view):
        token = request.auth

        if not token:
            return False

        required_scopes = self.get_scopes(view)

        try:
            resource_protector.validate_token(token, required_scopes, request)
        except InsufficientScopeError:
            return False
        return True
