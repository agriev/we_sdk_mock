from django.core.management.base import BaseCommand

from apps.discussions.models import Discussion
from apps.feed.models import Feed
from apps.games.models import Collection, CollectionFeed
from apps.reviews.models import Review


class Command(BaseCommand):
    def handle(self, *args, **options):
        for feed in Feed.objects.filter(action=Feed.ACTIONS_CREATE_COLLECTION):
            try:
                feed.language = Collection.objects.get(id=feed.data['collections'][0]).language or '-'
                feed.save(update_fields=['language'])
            except Collection.DoesNotExist:
                feed.delete()
        for feed in Feed.objects.filter(action=Feed.ACTIONS_ADD_FEED_TO_COLLECTION):
            try:
                feed.language = CollectionFeed.objects.get(id=feed.data['collection_feeds'][0]).language or '-'
                feed.save(update_fields=['language'])
            except CollectionFeed.DoesNotExist:
                feed.delete()
        for feed in Feed.objects.filter(action=Feed.ACTIONS_ADD_REVIEW):
            try:
                feed.language = Review.objects.get(id=feed.data['reviews'][0]).language or '-'
                feed.save(update_fields=['language'])
            except Review.DoesNotExist:
                feed.delete()
        for feed in Feed.objects.filter(action=Feed.ACTIONS_ADD_DISCUSSION):
            try:
                feed.language = Discussion.objects.get(id=feed.data['discussions'][0]).language or '-'
                feed.save(update_fields=['language'])
            except Discussion.DoesNotExist:
                feed.delete()
        self.stdout.write(self.style.SUCCESS('OK'))
