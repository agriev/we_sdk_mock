from django.core.management.base import BaseCommand

from apps.discussions import tasks
from apps.discussions.models import Discussion
from apps.feed.signals import MODELS_OPTIONS
from apps.utils.tasks import detect_language


class Command(BaseCommand):
    help = 'Rebuild the discussions fields'

    def handle(self, *args, **options):
        for discussion in Discussion.objects.all().only('id', 'text'):
            discussion.save()
            tasks.update_discussions_totals(discussion.id)
            detect_language(discussion.id, discussion._meta.app_label, discussion._meta.model_name,
                            MODELS_OPTIONS[Discussion]['language'](discussion))
        self.stdout.write(self.style.SUCCESS('OK'))
