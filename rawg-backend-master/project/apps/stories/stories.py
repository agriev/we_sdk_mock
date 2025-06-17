import contextlib
import os
import re
import subprocess
from pathlib import Path
from shutil import move

import pytube
from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.db import transaction
from django.template.loader import render_to_string
from googleapiclient.discovery import build

from apps.games.models import PlatformParent
from apps.stories.models import Clip, GameStory, Story, Video
from apps.utils.exceptions import capture_exception
from apps.utils.images import get_size, jpeg_optimize
from apps.utils.storage import default_storage_chunks_save
from apps.utils.strings import code
from apps.utils.video import video_concat, video_length, video_resize, video_segment, video_to_image


class YouTubeAPIHandler:
    youtube_api_service_name = 'youtube'
    youtube_api_version = 'v3'
    search_keyword = 'gameplay'
    search_results_count = 10
    video_max_length = 7200

    def youtube_search(self, query):
        youtube = build(
            self.youtube_api_service_name,
            self.youtube_api_version,
            developerKey=settings.YOUTUBE_DEVELOPER_KEY_STORIES,
            cache_discovery=False,
        )
        search_response = youtube.search().list(
            q='{} {}'.format(query, self.search_keyword),
            part='id,snippet',
            maxResults=self.search_results_count,
            type='video',
        ).execute()
        return self.check_youtube_search_items(search_response.get('items', None))

    def try_fetch_video(self, item):
        try:
            youtube = pytube.YouTube('https://youtu.be/{}'.format(item['id']['videoId']))
        except Exception:
            youtube = None
        return youtube, item['id']['videoId']

    def check_youtube_search_items(self, youtube_search_items):
        for item in youtube_search_items:
            youtube, youtube_id = self.try_fetch_video(item)
            if youtube and int(youtube.length) <= self.video_max_length:
                return youtube, youtube_id
        raise Exception('Original video is not downloaded')


class StoryGenerator:
    """
    Story generator class.

    Provides methods for generating clips for stories.
    """
    video_dir = '/tmp/stories'
    clip_length = 17
    clip_parts = 3
    clip_part = 2

    def __init__(self, game_story, game_id) -> None:
        super().__init__()
        os.makedirs(self.video_dir, exist_ok=True)
        self.second = None
        self.game_story = game_story
        self.game_id = game_id
        self.generate()

    def generate(self):
        try:
            if self.game_story.youtube_link:
                self.get_youtube_clip_timestamp(self.game_story.youtube_link)
                self.download_original_youtube_video(self.game_story.youtube_link)
            else:
                youtube, youtube_id = YouTubeAPIHandler().youtube_search(self.game_story.game.name)
                self.download_original_youtube_video(youtube=youtube, youtube_id=youtube_id)
            with transaction.atomic():
                self.create_video_instance()
            self.generate_game_clip()
            with transaction.atomic():
                self.create_clip_instance()
            with transaction.atomic():
                self.game_story.clip = self.clip
                self.game_story.game_id = self.game_id
                self.game_story.save()
        except Exception as e:
            if not self.game_story.is_error:
                self.game_story.is_error = True
                self.game_story.save(update_fields=['is_error'])
            capture_exception(e)
        self.delete_files(self.game_story.game.slug)

    def get_youtube_clip_timestamp(self, link):
        video_timestamp = re.search(r't=\d*', link)
        if not video_timestamp:
            return
        self.second = int(video_timestamp.group(0).split('=').pop())

    def get_youtube_clip_id(self, link):
        return link.split('/').pop().split('?').pop(0)

    def get_file_name(self, prefix='original', ext='mp4', full=True):
        name = f'{prefix}-{self.game_story.game.slug}-{self.game_story.id}'
        if ext:
            name = f'{name}.{ext}'
        if full:
            name = f'{self.video_dir}/{name}'
        return name

    def download_original_youtube_video(self, link=None, youtube=None, youtube_id=None):
        if link:
            youtube = pytube.YouTube(link)
            youtube_id = self.get_youtube_clip_id(link)
        stream = youtube.streams.filter(subtype='mp4', progressive=True).first()
        stream.download(
            output_path=self.video_dir,
            filename=self.get_file_name(full=False),
        )
        self.youtube_id = youtube_id

    def create_video_instance(self):
        video, _ = Video.objects.get_or_create(game=self.game_story.game, youtube_id=self.youtube_id)
        with open(self.get_file_name(), 'rb') as video_file:
            video.video = File(video_file)
            video.save()
        self.video = video

    def create_clip_instance(self):
        clip, _ = Clip.objects.get_or_create(game=self.game_story.game, video=self.video, second=self.second)
        with open(self.get_file_name('clip'), 'rb') as clip_file:
            clip.clip = File(clip_file)
            clip.save()
        with open(self.get_file_name('clip-320'), 'rb') as clip_file:
            clip.clip_320 = File(clip_file)
            clip.save()
        with open(self.get_file_name('clip-640'), 'rb') as clip_file:
            clip.clip_640 = File(clip_file)
            clip.save()
        with open(self.get_file_name('preview', 'jpg'), 'rb') as preview_file:
            clip.preview = File(preview_file)
            clip.save()
        self.clip = clip

    def save_original_video(self):
        path = self.get_file_name()
        if os.path.isfile(path):
            return
        with open(path, 'wb') as write:
            default_storage_chunks_save(self.video.video.name, write)

    def generate_game_clip(self):
        self.save_original_video()
        if not self.second:
            self.second = video_length(self.get_file_name()) / self.clip_parts * self.clip_part
        video_segment(self.get_file_name(), self.get_file_name('clip'), self.second, self.clip_length)
        video_resize(self.get_file_name('clip'), self.get_file_name('clip-640'), 640)
        video_resize(self.get_file_name('clip'), self.get_file_name('clip-320'), 320)
        preview = self.get_file_name('preview', 'jpg')
        video_to_image(self.get_file_name('clip'), preview, 0)
        jpeg_optimize(preview, loss=True)

    def delete_files(self, game_slug):
        with contextlib.suppress(FileNotFoundError):
            os.remove(self.get_file_name())
        with contextlib.suppress(FileNotFoundError):
            os.remove(self.get_file_name('clip'))
        with contextlib.suppress(FileNotFoundError):
            os.remove(self.get_file_name('clip-320'))
        with contextlib.suppress(FileNotFoundError):
            os.remove(self.get_file_name('clip-640'))
        with contextlib.suppress(FileNotFoundError):
            os.remove(self.get_file_name('preview', 'jpg'))


class StoryDownloader:
    video_dir = '/tmp/stories'
    clip_length = None
    clips_count = None
    scale = False
    width = None
    height = None
    link = None

    def __init__(self, story: Story, clip_length: int = None, clips_count: int = None) -> None:
        super().__init__()
        self.video_dir = f'{self.video_dir}/{code()}'
        os.makedirs(self.video_dir, exist_ok=True)
        self.story = story
        self.clip_length = clip_length
        self.clips_count = clips_count
        qs = self.story.game_stories.visible()
        clips_count = clips_count if clips_count else 100
        self.game_stories = [game_story for game_story in qs if game_story.clip_id][0:clips_count]
        self.generate()

    def generate(self):
        try:
            self.save_clips()
            self.detect_size()
            self.generate_logos()
            self.cut_clips()
            self.output()
            self.upload()
        except Exception as e:
            capture_exception(e)
        self.delete_files()

    def save_clips(self):
        for game_story in self.game_stories:
            self.save_clip(game_story.id, game_story.clip.clip.name)

    def save_clip(self, pk, name):
        path = self.get_file_name(pk)
        if os.path.isfile(path):
            return
        with open(path, 'wb') as write:
            default_storage_chunks_save(name, write)

    def detect_size(self):
        sizes = []
        for game_story in self.game_stories:
            preview = self.get_file_name(game_story.id, 'preview', 'jpg')
            with open(preview, 'wb') as write:
                default_storage_chunks_save(game_story.clip.preview.name, write)
            sizes.append(get_size(preview))
        self.scale = False
        for size in sizes:
            if not self.width:
                self.width, self.height = size
                continue
            if size != (self.width, self.height):
                self.scale = True
                break
        if self.scale:
            max_width = 0
            for width, height in sizes:
                if width > max_width:
                    self.scale = f'{width}:{height}'
                    self.width, self.height = width, height
                    max_width = width

    def generate_logos(self):
        for game_story in self.game_stories:
            self.generate_logo(game_story, game_story.clip.preview.name)

    def generate_logo(self, game_story: GameStory, name):
        template = Path(self.video_dir, f'{game_story.id}.html')
        background_image = game_story.game.background_image
        background_image = getattr(background_image, 'url', background_image)
        template.write_text(render_to_string('stories/download.html', {
            'width': self.width,
            'height': self.height,
            'name': self.story.name,
            'game': game_story.game.name,
            'image': background_image.replace('/media/', '/media/crop/150/150/') if background_image else None,
            'platforms': PlatformParent.objects.filter(
                id__in=game_story.game.platforms.values_list('parent_id', flat=True)
            ).values_list('slug', flat=True)
        }))

        js = Path(self.video_dir, f'{game_story.id}.js')
        js.write_text(render_to_string('share/js.html', {
            'template': template.resolve(),
            'output': self.get_file_name(game_story.id, 'logo', 'png'),
            'size': (self.width, self.height),
            'format': 'png',
        }))

        new_env = os.environ.copy()
        new_env['OPENSSL_CONF'] = '/etc/ssl/'
        subprocess.check_call(['phantomjs', str(js.resolve())], stdout=subprocess.DEVNULL, env=new_env)

    def cut_clips(self):
        for game_story in self.game_stories:
            self.cut_clip(game_story.id)

    def cut_clip(self, pk):
        clip = self.get_file_name(pk)
        cut = self.get_file_name(pk, 'cut')
        if self.clip_length:
            video_segment(clip, cut, 0, self.clip_length)
        else:
            move(clip, cut)

    def output(self):
        files = []
        logos = []
        for game_story in self.game_stories:
            files.append(self.get_file_name(game_story.id, 'cut'))
            logos.append(self.get_file_name(game_story.id, 'logo', 'png'))
        video_concat(files, logos, self.get_file_name('output'), self.scale)

    def upload(self):
        suffix = ''
        if self.clip_length:
            suffix += f'-{self.clip_length}'
        if self.clips_count:
            suffix += f'-{self.clips_count}'
        path = os.path.join('stories-downloads', f'{self.story.id}{suffix}.mp4')
        default_storage.delete(path)
        with open(self.get_file_name('output'), 'rb') as f:
            default_storage.save(path, f)
        self.link = f'{settings.MEDIA_URL}{path}'

    def get_file_name(self, pk, prefix='clip', ext='mp4', full=True):
        name = f'{prefix}-{pk}'
        if ext:
            name = f'{name}.{ext}'
        if full:
            name = f'{self.video_dir}/{name}'
        return name

    def delete_files(self):
        for game_story in self.game_stories:
            with contextlib.suppress(FileNotFoundError):
                os.remove(self.get_file_name(game_story.id))
            with contextlib.suppress(FileNotFoundError):
                os.remove(self.get_file_name(game_story.id, 'cut'))
            with contextlib.suppress(FileNotFoundError):
                os.remove(self.get_file_name(game_story.id, 'preview', 'jpg'))
            with contextlib.suppress(FileNotFoundError):
                os.remove(self.get_file_name(game_story.id, 'logo', 'png'))
            with contextlib.suppress(FileNotFoundError):
                os.remove(str(Path(self.video_dir, f'{game_story.id}.js').resolve()))
            with contextlib.suppress(FileNotFoundError):
                os.remove(str(Path(self.video_dir, f'{game_story.id}.html').resolve()))
        with contextlib.suppress(FileNotFoundError):
            os.remove(self.get_file_name('output'))
