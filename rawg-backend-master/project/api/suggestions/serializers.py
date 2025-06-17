from rest_framework import serializers

from api.games.serializers import GameSerializer, TagShortSerializer
from apps.common.seo import suggestion
from apps.games.models import Tag
from apps.suggestions import models


class SuggestionsGamesReprMixin(object):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        suggested_games = self.context.get('suggested_games')
        if suggested_games:
            data['games'] = GameSerializer(suggested_games[instance.pk], many=True, context=self.context).data
        return data


class SuggestionsShortSerializer(SuggestionsGamesReprMixin, serializers.ModelSerializer):
    class Meta:
        model = models.Suggestion
        fields = ('id', 'name', 'slug', 'games_count', 'image')


class SuggestionsSerializer(SuggestionsGamesReprMixin, serializers.ModelSerializer):
    class Meta:
        model = models.Suggestion
        fields = (
            'id', 'name', 'slug', 'description', 'created', 'updated',
            'games_count', 'image',
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['related_tags'] = TagShortSerializer(
            Tag.objects.filter(
                id__in=instance.related_tags,
                hidden=False,
                language=self.context['request'].LANGUAGE_CODE_ISO3,
            ), many=True
        ).data
        data.update(suggestion(data['name'], data['description'], self.context['request']))
        return data
