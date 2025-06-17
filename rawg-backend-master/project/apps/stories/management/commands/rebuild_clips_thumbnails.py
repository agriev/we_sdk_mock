import contextlib
import os

from django.core.files import File
from django.core.management.base import BaseCommand
from django.db.models import ExpressionWrapper, F, IntegerField

from apps.stories.models import Clip
from apps.utils.storage import default_storage_chunks_save
from apps.utils.video import video_resize


class Command(BaseCommand):
    help = 'Rebuild Clips Thumbnails'

    def add_arguments(self, parser):
        parser.add_argument('-i', '--clip_id', action='store', dest='clip_id', default=0, type=int)
        parser.add_argument('-n', '--num', action='store', dest='num', default=0, type=int)
        parser.add_argument('-l', '--len', action='store', dest='len', default=1, type=int)

    def handle(self, *args, **options):
        qs = self.qs(options)
        total = qs.count()
        for i, clip in enumerate(qs):
            if clip.clip_320 and clip.clip_640:
                continue
            name_original = f'/tmp/clip-{clip.id}.mp4'
            name_640 = f'/tmp/clip-640-{clip.id}.mp4'
            name_320 = f'/tmp/clip-320-{clip.id}.mp4'
            if not os.path.isfile(name_original):
                with open(name_original, 'wb') as write:
                    default_storage_chunks_save(clip.clip.name, write)
            video_resize(name_original, name_640, 640)
            video_resize(name_original, name_320, 320)
            with open(name_640, 'rb') as clip_file:
                clip.clip_640 = File(clip_file)
                clip.save()
            with open(name_320, 'rb') as clip_file:
                clip.clip_320 = File(clip_file)
                clip.save()
            with contextlib.suppress(FileNotFoundError):
                os.remove(name_original)
            with contextlib.suppress(FileNotFoundError):
                os.remove(name_320)
            with contextlib.suppress(FileNotFoundError):
                os.remove(name_640)
            self.stdout.write(self.style.SUCCESS(f'{i + 1} of {total}'))
        self.stdout.write(self.style.SUCCESS('OK'))

    def qs(self, options):
        process_num = options['num']
        processes = options['len']
        qs = Clip.objects.all()
        if options['clip_id']:
            qs = qs.filter(id=options['clip_id'])
        if processes > 1:
            mod = ExpressionWrapper(F('id') % processes, output_field=IntegerField())
            qs = qs.annotate(mod=mod).filter(mod=process_num).order_by('id')
        return qs
