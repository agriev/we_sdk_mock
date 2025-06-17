from rest_framework import serializers
from .models import Game

class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = [
            'id', 'title', 'slug', 'description', 'launch_url', 'thumbnail', 'opens'
        ]
        read_only_fields = ['opens'] 