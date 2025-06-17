from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import F
from .models import Game
from .serializers import GameSerializer

class GameViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Game.objects.filter(is_active=True)
    serializer_class = GameSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset

    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        return serializer

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def open(self, request, slug=None):
        game = self.get_object()
        game.opens = F('opens') + 1
        game.save(update_fields=['opens'])
        game.refresh_from_db()
        return Response({'opens': game.opens}) 