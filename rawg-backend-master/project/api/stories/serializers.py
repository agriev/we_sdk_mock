from rest_framework import serializers

from api.games.serializers import GameSerializer
from apps.common.seo import story
from apps.stories.models import Clip, GameStory, Story, UserStory, Video

welcome_videos = [
    {
        'game': None,
        'url': 'https://cdn.ag.ru/media/stories-onboarding/stories1.m4v?ver=4',
        'preview': 'https://cdn.ag.ru/media/stories-onboarding/stories1.jpg?ver=4',
        'video': '',
        'second': 0,
    },
    {
        'game': None,
        'url': 'https://cdn.ag.ru/media/stories-onboarding/stories2.m4v?ver=4',
        'preview': 'https://cdn.ag.ru/media/stories-onboarding/stories2.jpg?ver=4',
        'video': '',
        'second': 0,
    },
    {
        'game': None,
        'url': 'https://cdn.ag.ru/media/stories-onboarding/stories3.m4v?ver=4',
        'preview': 'https://cdn.ag.ru/media/stories-onboarding/stories3.jpg?ver=4',
        'video': '',
        'second': 0,
    },
    {
        'game': None,
        'url': 'https://cdn.ag.ru/media/stories-onboarding/stories4.m4v?ver=4',
        'preview': 'https://cdn.ag.ru/media/stories-onboarding/stories4.jpg?ver=4',
        'video': '',
        'second': 0,
    },
]
welcome_videos_mobile = [
    {
        'game': None,
        'url': 'https://cdn.ag.ru/media/stories-onboarding/stories1mobile.m4v?ver=2',
        'preview': 'https://cdn.ag.ru/media/stories-onboarding/stories1mobile.jpg?ver=2',
        'video': '',
        'second': 0,
    },
    {
        'game': None,
        'url': 'https://cdn.ag.ru/media/stories-onboarding/stories2mobile.m4v?ver=2',
        'preview': 'https://cdn.ag.ru/media/stories-onboarding/stories2mobile.jpg?ver=2',
        'video': '',
        'second': 0,
    },
    {
        'game': None,
        'url': 'https://cdn.ag.ru/media/stories-onboarding/stories3mobile.m4v?ver=2',
        'preview': 'https://cdn.ag.ru/media/stories-onboarding/stories3mobile.jpg?ver=2',
        'video': '',
        'second': 0,
    },
    {
        'game': None,
        'url': 'https://cdn.ag.ru/media/stories-onboarding/stories4mobile.m4v?ver=2',
        'preview': 'https://cdn.ag.ru/media/stories-onboarding/stories4mobile.jpg?ver=2',
        'video': '',
        'second': 0,
    },
]


class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = ('youtube_id',)
        read_only_fields = fields


class ClipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clip
        fields = ('clip', 'preview', 'second')
        read_only_fields = fields


class ClipShortSerializer(ClipSerializer):
    class Meta(ClipSerializer.Meta):
        fields = ('clip', 'clip_320', 'clip_640', 'preview')
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['clips'] = {
            'full': data['clip'],
            '320': data['clip_320'],
            '640': data['clip_640'],
        }
        data['clip'] = data['clip_640']
        data['video'] = VideoSerializer(instance.video, context=self.context).data['youtube_id']
        del data['clip_320']
        del data['clip_640']
        return data


class GameStorySerializer(serializers.ModelSerializer):
    game = GameSerializer()
    url = serializers.URLField(default='')
    preview = serializers.URLField(default='')
    video = serializers.CharField(default='', help_text='Youtube Id')
    second = serializers.IntegerField(default=0)

    class Meta:
        model = GameStory
        fields = ('game', 'url', 'preview', 'video', 'second')
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        clip = ClipSerializer(instance.clip, context=self.context).data
        video = VideoSerializer(instance.clip.video, context=self.context).data
        data['url'] = clip['clip']
        data['preview'] = clip['preview']
        data['video'] = video['youtube_id']
        data['second'] = clip['second']
        data['new'] = instance.id not in self.context.get('user_game_stories', [])
        return data


class StoryShortSerializer(serializers.ModelSerializer):
    has_new_games = serializers.BooleanField(default=True)

    class Meta:
        model = Story
        fields = ('id', 'name', 'slug', 'background', 'has_new_games')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['has_new_games'] = instance.id not in self.context.get('user_stories', [])
        return data

    def welcome(self, videos, has_new_games):
        data = []
        for video in videos:
            row = {'new': has_new_games}
            row.update(video)
            data.append(row)
        return data


class StorySerializer(StoryShortSerializer):
    videos = GameStorySerializer(source='game_stories', many=True)

    class Meta(StoryShortSerializer.Meta):
        fields = ('id', 'name', 'slug', 'background', 'custom_background', 'videos', 'has_new_games')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data['custom_background']:
            data['background'] = data['custom_background']
            del data['custom_background']
        if data['slug'] == 'welcome':
            data['background'] = 'https://cdn.ag.ru/media/stories-onboarding/avatar.jpg'
            data['videos'] = self.welcome(welcome_videos, data['has_new_games'])
            data['videos_mobile'] = self.welcome(welcome_videos_mobile, data['has_new_games'])
        elif data['videos']:
            if data['has_new_games']:
                old = []
                new = []
                for video in data['videos']:
                    if video['new']:
                        new.append(video)
                    else:
                        old.append(video)
                data['videos'] = old + new
            else:
                for video in data['videos']:
                    video['new'] = False
        if self.context['view'].action == 'retrieve':
            data.update(story(data['name'], data['slug'], data['background'], self.context['request']))
        return data


class UserStorySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserStory
        fields = ('story',)
        extra_kwargs = {
            'story': {'help_text': 'Id of a Story object.'},
        }
        swagger_schema_fields = {
            'example': {
                'story': 123,
            },
        }
