from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count

from apps.games.models import Game
from apps.reviews.models import Review, Versus
from apps.reviews.tasks import versus_update_internal


class Command(BaseCommand):
    help = 'Rebuild the versus list'

    def handle(self, *args, **options):
        with transaction.atomic():
            Versus.objects.all().delete()
            games = Review.objects.visible() \
                .filter(likes_rating__gte=Versus.MIN_RATING, is_text=True) \
                .values_list('game_id').annotate(count=Count('id')) \
                .order_by('game_id').values_list('game_id', flat=True)
            for pk in games:
                versus_update_internal(None, False, Game.objects.get(id=pk))
            self.stdout.write(self.style.SUCCESS('OK'))
