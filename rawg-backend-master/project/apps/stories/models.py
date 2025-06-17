from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import JSONField
from django.db import models

from apps.games.models import Game
from apps.utils.fields.autoslug import CIAutoSlugField
from apps.utils.lang import get_site_by_current_language
from apps.utils.models import OrderedHiddenModel
from apps.utils.upload import upload_to


def story_image(instance, filename):
    return upload_to('stories-images', instance, filename, False)


class Story(OrderedHiddenModel):
    is_ready = models.BooleanField(default=False, editable=False)
    hidden = models.BooleanField(default=True, db_index=True)
    use_for_partners = models.BooleanField(default=True, db_index=True)
    name = models.CharField(max_length=100)
    slug = CIAutoSlugField(populate_from='name', unique=True)
    background = models.URLField(blank=True, null=True, default='', max_length=500, editable=False)
    first = JSONField(null=True, blank=True, default=None, editable=False)
    custom_background = models.ImageField(upload_to=story_image, blank=True, null=True)

    class Meta:
        verbose_name = 'Story'
        verbose_name_plural = 'Stories'
        ordering = ('order',)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return '{}://{}/showcase/?tldr={}'.format(
            settings.SITE_PROTOCOL, get_site_by_current_language().name, self.slug
        )

    def check_ready(self):
        if self.slug == 'welcome':
            Story.objects.filter(id=self.id).update(is_ready=True)
            return
        count = self.game_stories.visible().count()
        kwargs = {'is_ready': False}
        if not count:
            kwargs['hidden'] = True
        elif count == self.game_stories.visible().exclude(clip=None).count():
            first = self.game_stories.visible().first()
            background_image = first.game.background_image
            kwargs['background'] = getattr(background_image, 'url', background_image)
            kwargs['is_ready'] = True
            kwargs['first'] = {
                'game_id': first.clip.game_id,
                'url': first.clip.clip.url if first.clip.clip else '',
                'preview': first.clip.preview.url if first.clip.preview else '',
                'video': first.clip.video.youtube_id if first.clip.video else '',
                'second': first.clip.second,
                'game_story_id': first.id,
            }
        Story.objects.filter(id=self.id).update(**kwargs)

    def get_context(self, request):
        return self.get_many_context([self], request)

    @classmethod
    def get_many_context(cls, stories, request=None, not_short=True):
        data = {}
        if request.user.is_authenticated:
            data['user_stories'] = list(UserStory.objects.filter(
                user=request.user,
                story__in=[story.pk for story in stories]
            ).values_list('story_id', flat=True))
            if not_short:
                data['user_game_stories'] = list(UserGameStory.objects.filter(
                    user=request.user,
                    game_story__in=[game_story.id for story in stories for game_story in story.game_stories.all()]
                ).values_list('game_story_id', flat=True))
        return data


def original_video(instance, filename):
    return upload_to('stories-originals', instance, filename, False)


class Video(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, blank=True, null=True, db_index=False)
    youtube_id = models.CharField(max_length=100)
    video = models.FileField(upload_to=original_video, blank=True, null=True)

    class Meta:
        verbose_name = 'Video'
        verbose_name_plural = 'Videos'
        unique_together = ('youtube_id', 'game')

    def __str__(self):
        return 'Original - {}'.format(self.id)


def story_clip(instance, filename):
    return upload_to('stories', instance, filename, False)


def story_clip_320(instance, filename):
    return upload_to('stories-320', instance, filename, False)


def story_clip_640(instance, filename):
    return upload_to('stories-640', instance, filename, False)


def story_preview(instance, filename):
    return upload_to('stories-previews', instance, filename, False)


class Clip(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, blank=True, null=True, db_index=False)
    video = models.ForeignKey(Video, on_delete=models.CASCADE, blank=True, null=True, db_index=False)
    second = models.PositiveIntegerField(default=0, db_index=False)
    clip = models.FileField(upload_to=story_clip, blank=True, null=True)
    clip_320 = models.FileField(upload_to=story_clip_320, blank=True, null=True)
    clip_640 = models.FileField(upload_to=story_clip_640, blank=True, null=True)
    preview = models.FileField(upload_to=story_preview, blank=True, null=True)

    class Meta:
        verbose_name = 'Clip'
        verbose_name_plural = 'Clips'
        unique_together = ('video', 'second', 'game')

    def __str__(self):
        return 'Clip - {}'.format(self.id)


class GameStory(OrderedHiddenModel):
    is_error = models.BooleanField(default=False)
    order = models.PositiveIntegerField(editable=True, db_index=True)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='+')
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='game_stories')
    clip = models.ForeignKey(Clip, on_delete=models.CASCADE, null=True, blank=True)
    youtube_link = models.URLField(max_length=200, default='', blank=True)

    init_fields = ('hidden', 'game_id', 'youtube_link')

    class Meta:
        verbose_name = 'Game Story'
        verbose_name_plural = 'Game Stories'
        ordering = ('order',)

    def __str__(self):
        return 'Game Story - {}'.format(self.id)


class UserGameStory(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    game_story = models.ForeignKey(GameStory, on_delete=models.CASCADE)

    class Meta:
        verbose_name = 'User Game Story'
        verbose_name_plural = 'User Game Stories'
        unique_together = ('user', 'game_story')

    def __str__(self):
        return 'User Game Story - {}'.format(self.id)


class UserStory(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    story = models.ForeignKey(Story, on_delete=models.CASCADE)

    class Meta:
        verbose_name = 'User Story'
        verbose_name_plural = 'User Stories'
        unique_together = ('user', 'story')

    def __str__(self):
        return 'User Story - {}'.format(self.id)
