from django.core.management.base import BaseCommand
from django.core.serializers import serialize
from reversion.models import Revision, Version

from apps.utils.dates import yesterday


class Command(BaseCommand):
    def handle(self, *args, **options):
        qs = Revision.objects.filter(date_created__date__gte=yesterday(30))
        data = serialize('json', qs)
        with open('/tmp/revisions.json', 'w') as f:
            f.write(data)
        revision_id = qs.order_by('id').first().id
        qs = Version.objects.filter(revision_id__gte=revision_id)
        data = serialize('json', qs)
        with open('/tmp/versions.json', 'w') as f:
            f.write(data)
