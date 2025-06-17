from django.core.management.base import BaseCommand

from apps.feed.signals import MODELS_OPTIONS
from apps.reviews import tasks
from apps.reviews.models import Review
from apps.utils.tasks import detect_language


class Command(BaseCommand):
    help = 'Rebuild the reviews fields'

    def handle(self, *args, **options):
        for review in Review.objects.filter(is_text=True).only('id', 'game_id', 'text'):
            review.save()
            tasks.update_reviews_totals(review.game_id, True, True)
            tasks.update_likes_totals(review.id)
            detect_language(review.id, Review._meta.app_label, Review._meta.model_name,
                            MODELS_OPTIONS[Review]['language'](review))
        self.stdout.write(self.style.SUCCESS('OK'))
