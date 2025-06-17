from rest_framework import serializers

from api.games.serializers import GameSerializer as DefaultGameSerializer
from api.users.serializers import UserSerializer
from apps.achievements.models import Achievement, ParentAchievement
from apps.token import models


class CycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Cycle
        fields = ('id', 'start', 'end', 'finished', 'achievements', 'percent', 'status')
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data['status'] == self.Meta.model.STATUS_FINISHING:
            data['status'] = self.Meta.model.STATUS_ACTIVE
        if data['status'] == self.Meta.model.STATUS_SUCCESS:
            data['status'] = self.Meta.model.STATUS_COMPLETED
        return data


class CycleUserSerializer(serializers.ModelSerializer):
    position = serializers.IntegerField()

    class Meta:
        model = models.CycleUser
        fields_base = {
            'karma', 'achievements', 'achievements_gold', 'achievements_silver', 'achievements_bronze',
            'position', 'position_yesterday'
        }
        fields = list(fields_base)
        read_only_fields = fields


class CycleUserListSerializer(CycleUserSerializer):
    user = UserSerializer()

    class Meta(CycleUserSerializer.Meta):
        fields = list(CycleUserSerializer.Meta.fields_base.union(['user']).difference(['position']))
        read_only_fields = fields


class GameSerializer(DefaultGameSerializer):
    class Meta(DefaultGameSerializer.Meta):
        fields = DefaultGameSerializer.Meta.fields + ['parent_achievements_count']
        read_only_fields = DefaultGameSerializer.Meta.read_only_fields + ['parent_achievements_count']
        ref_name = 'GameTokenSerializer'


class ParentAchievementSerializer(serializers.ModelSerializer):
    image = serializers.ImageField()

    class Meta:
        model = ParentAchievement
        fields = ('id', 'name', 'percent', 'image')
        read_only_fields = fields

    def to_representation(self, instance):
        achievement = instance.achievements.order_by('network_id').first()
        instance.image_source = achievement.image_source
        instance.image = achievement.image

        data = super().to_representation(instance)

        data['achieved'] = None
        data['description'] = achievement.description
        data['karma'] = models.CycleKarma.get_karma(
            data['percent'],
            models.CycleKarma.get_statuses(instance.game_id, self.context['view'].cycle_id)
        )
        data['type'] = models.CycleKarma.get_type(data['percent'])

        if not data['image'] and instance.image_source:
            data['image'] = instance.image_source
        return data


class CycleKarmaSerializer(serializers.ModelSerializer):
    name = serializers.CharField()
    percent = serializers.CharField()
    description = serializers.CharField()
    image = serializers.ImageField()
    achieved = serializers.DateTimeField()

    class Meta:
        model = models.CycleKarma
        fields = [
            'id', 'name', 'percent', 'achieved', 'image', 'description',
            'karma', 'is_new'
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        instance.image_source = None
        if instance.image_sources:
            instance.image_source = instance.image_sources[0]
        instance.image = None
        if instance.images:
            a = Achievement()
            a.image_file = instance.images[0]
            instance.image = a.image

        instance.description = ''
        index_id = instance.networks.index(min(instance.networks))
        if index_id < len(instance.descriptions):
            instance.description = instance.descriptions[index_id]

        data = super().to_representation(instance)
        data['type'] = models.CycleKarma.get_type(data['percent'])
        data['game'] = {
            'id': instance.game_id,
            'name': instance.game_name,
            'slug': instance.game_slug,
        }

        if not data['image'] and instance.image_source:
            data['image'] = instance.image_source
        return data


class CycleKarmaLastSerializer(CycleKarmaSerializer):
    user = UserSerializer()

    class Meta(CycleKarmaSerializer.Meta):
        fields = CycleKarmaSerializer.Meta.fields + ['user']
        read_only_fields = fields

    def to_representation(self, instance):
        instance.name = ''
        achievement = instance.parent_achievement.achievements.order_by(
            'network_id'
        ).only(
            'description', 'name', 'percent'
        ).first()
        if achievement:
            instance.name = achievement.name
            instance.descriptions = [achievement.description]
            instance.images = [achievement.image_file]
            instance.image_sources = [achievement.image_source]
            instance.networks = [0]
        instance.percent = instance.parent_achievement.percent
        instance.game_id = instance.parent_achievement.game_id
        instance.game_name = instance.parent_achievement.game.name if instance.game_id else ''
        instance.game_slug = instance.parent_achievement.game.slug if instance.game_id else ''
        return super().to_representation(instance)
