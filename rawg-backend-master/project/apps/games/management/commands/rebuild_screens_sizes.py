from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand
from django.db.models import ExpressionWrapper, F, IntegerField, Q
from PIL import ImageFile
from tqdm import tqdm

from apps.games.models import ScreenShot
from apps.utils.exceptions import capture_exception

RANGE = 512


class Command(BaseCommand):
    help = 'Rebuild sizes of games screenshots'

    def add_arguments(self, parser):
        parser.add_argument('-n', '--num', action='store', dest='num', default=0, type=int)
        parser.add_argument('-l', '--len', action='store', dest='len', default=1, type=int)
        parser.add_argument('-f', '--full', action='store_true', dest='full', default=False)

    def handle(self, *args, **options):
        process_num = options['num']
        processes = options['len']

        qs = ScreenShot.objects.only('image').order_by('-game__added', 'id')

        if not options['full']:
            qs = qs.filter(Q(width=None) | Q(height=None))

        if processes > 1:
            mod = ExpressionWrapper(F('id') % processes, output_field=IntegerField())
            qs = qs.annotate(mod=mod).filter(mod=process_num)

        qs_iter = qs.iterator()
        counter = 0
        data = []
        for screen in tqdm(qs_iter, total=qs.count()):
            if not screen.image:
                continue
            try:
                screen.width, screen.height = self.size_s3(screen.image.name)
            except Exception as e:
                capture_exception(e, raise_on_debug=False, raise_on_tests=False)
                continue
            data.append(screen)
            counter += 1
            if counter == 2000:
                ScreenShot.objects.bulk_update(data, ['width', 'height'])
                counter = 0
                data = []
        ScreenShot.objects.bulk_update(data, ['width', 'height'])
        self.stdout.write(self.style.SUCCESS('OK'))

    def size_s3(self, name):
        parser = ImageFile.Parser()
        file = default_storage.open(name)
        file = file.obj.get()['Body']
        while True:
            chunk = file.read(RANGE)
            parser.feed(chunk)
            if parser.image or not chunk:
                break
        return parser.image.size
