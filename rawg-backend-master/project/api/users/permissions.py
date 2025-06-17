from rest_framework import permissions
from rest_framework.permissions import SAFE_METHODS


class IsUser(permissions.IsAuthenticatedOrReadOnly):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        return obj == request.user


class IsUserStrict(permissions.IsAuthenticated):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user == view.user)


class IsUserOwner(permissions.IsAuthenticatedOrReadOnly):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user_id == request.user.pk


class IsUserOwnerOrAdmin(permissions.IsAuthenticatedOrReadOnly):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_authenticated and request.user.is_staff:
            if request.user.is_superuser:
                return True
            action = 'delete' if request.method == 'DELETE' else 'change'
            if request.user.has_perm('{}.{}_{}'.format(obj._meta.app_label, action, obj._meta.model_name)):
                return True
        return obj.user_id == request.user.pk


class IsUserRelated(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method not in permissions.SAFE_METHODS and not request.user.is_authenticated:
            return False
        user_pk = view.kwargs.get('user_pk')
        if request.method == 'POST' and user_pk and view.user_id != request.user.pk:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user_id == request.user.pk


class IsUserRealEmail(permissions.IsAuthenticatedOrReadOnly):
    def has_permission(self, request, view):
        if request.method not in SAFE_METHODS:
            return request.user and request.user.is_authenticated and request.user.can_edit_games
        return super().has_permission(request, view)
