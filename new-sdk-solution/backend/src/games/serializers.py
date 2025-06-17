from rest_framework import serializers
from .models import Game

class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = [
            'id', 'title', 'slug', 'description', 'launch_url', 'thumbnail', 'opens', 'category'
        ]
        read_only_fields = ['opens'] 