from rest_framework import permissions


class IsSocial(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS + ('POST',):
            return True
        return request.user.is_authenticated
