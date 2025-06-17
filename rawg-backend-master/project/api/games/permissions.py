from rest_framework import permissions

from api.permissions import IsOwnerOrReadOnlyByUser
from apps.utils.game_session import CommonPlayerGameSessionData, PlayerGameSessionController


class IsCollection(IsOwnerOrReadOnlyByUser):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS and not obj.is_private:
            return True
        return obj.creator_id == request.user.pk


class IsCollectionGame(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method not in permissions.SAFE_METHODS and not request.user.is_authenticated:
            return False
        if request.method == 'POST' and view.collection and view.collection.creator_id != request.user.pk:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.collection.creator_id == request.user.pk


class IsCollectionOffer(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method not in permissions.SAFE_METHODS and not request.user.is_authenticated:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.pk in (obj.collection.creator_id, obj.creator_id)


class IsValidAuthKey(permissions.BasePermission):
    def has_object_permission(self, request, view, obj: CommonPlayerGameSessionData):
        auth_key = request.query_params.get('auth_key')
        if not auth_key:
            return False
        return PlayerGameSessionController.validate_auth_key(auth_key, obj)
