from django.core.management.base import BaseCommand
from django.db import IntegrityError
from psycopg2 import errorcodes

from apps.achievements.models import Achievement
from apps.merger.tasks.common import get_game_cached
from apps.utils.exceptions import capture_exception


class Command(BaseCommand):
    def handle(self, *args, **options):
        try:
            self.run()
        except Exception as e:
            capture_exception(e)
            self.stdout.write(self.style.ERROR(str(e)))
        self.stdout.write(self.style.SUCCESS('OK'))

    def run(self):
        qs = Achievement.objects.prefetch_related('parent', 'network').filter(parent__game=None) \
            .only('id', 'network', 'uid')
        counter = 0
        total = qs.count()
        for i, achieve in enumerate(qs):
            app_id = achieve.uid.split('_')[0]
            kwargs = None
            if achieve.network.slug == 'playstation':
                app_id = '{}_{}'.format(app_id, achieve.uid.split('_')[1])
                kwargs = {'store_internal_id__icontains': app_id}
            game_instance, _ = get_game_cached(app_id, achieve.parent.game_name, achieve.network.slug, kwargs)
            if game_instance:
                achieve.parent.game_id = game_instance.id
                try:
                    achieve.parent.save(update_fields=['game_id'])
                except IntegrityError as e:
                    if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                        raise
                    continue
                counter += 1
                self.stdout.write(self.style.SUCCESS(game_instance.name))
        self.stdout.write(self.style.SUCCESS('{} of {} were found'.format(counter, total)))
