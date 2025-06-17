import requests
from django.core.management.base import BaseCommand
from django.db.models import Q
from tqdm import tqdm

from apps.games.models import ScreenShot
from apps.utils.exceptions import capture_exception
from apps.utils.images import ImageException, content_to_jpeg_file


class Command(BaseCommand):
    help = 'Fix empty images of games screenshots'

    def handle(self, *args, **options):
        qs = ScreenShot.objects.only('image').filter(Q(image=None) | Q(image=''))
        for screen in tqdm(qs.iterator(), total=qs.count()):
            if not screen.source:
                screen.delete()
                continue
            content = requests.get(screen.source).content
            try:
                screen_name, jpg_content, screen.width, screen.height = \
                    content_to_jpeg_file(screen.source, content, min_size=50, sizes=True)
            except ImageException:
                screen.delete()
                continue
            except Exception as e:
                capture_exception(e, raise_on_debug=False, raise_on_tests=False)
                continue
            screen.image.save(screen_name, jpg_content)
