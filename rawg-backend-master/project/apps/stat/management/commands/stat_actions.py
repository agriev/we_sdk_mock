import csv

from dateutil.relativedelta import relativedelta
from django.core.management.base import BaseCommand
from django.utils.timezone import now
from tqdm import tqdm

from apps.comments.models import CommentCollectionFeed, CommentDiscussion, CommentReview
from apps.discussions.models import Discussion
from apps.games.models import Collection, CollectionGame
from apps.merger.models import ImportLog
from apps.reviews.models import Review
from apps.stat.models import (
    CarouselRating, RecommendationsVisit, RecommendedGameAdding, RecommendedGameStoreVisit, RecommendedGameVisit,
    Status, Visit,
)
from apps.users.models import UserFollowElement


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('-t', '--type', action='store', dest='target', default='week', type=str)
        parser.add_argument('-m', '--month', action='store', dest='month', type=int)

    def handle(self, *args, **options):
        start_date = now().replace(day=1, month=options['month'], hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + relativedelta(months=1)

        if options['target'] == 'week':
            visits_by_week = set(
                Visit.objects
                .filter(
                    datetime__date__gte=start_date,
                    datetime__date__lt=end_date
                )
                .values_list('user_id', 'datetime__week')
                .order_by('datetime')
            )
            users_counters = {}
            for user_id, _ in visits_by_week:
                counter = users_counters.get(user_id, 0)
                counter += 1
                users_counters[user_id] = counter
            every_week = []
            for user_id, count in users_counters.items():
                if count >= 4:
                    every_week.append(user_id)
            for user_id in tqdm(sorted(every_week)):
                self.print_a_user(user_id, start_date, end_date, options['target'])

        if options['target'] == 'new':
            visits_by_new_once_a_month = set(
                Visit.objects
                .filter(
                    user__date_joined__gte=start_date,
                    user__date_joined__lt=end_date,
                    datetime__date__gte=start_date,
                    datetime__date__lt=end_date
                )
                .values_list('user_id', 'datetime__day')
                .order_by('datetime')
            )
            users_counters = {}
            for user_id, _ in visits_by_new_once_a_month:
                counter = users_counters.get(user_id, 0)
                counter += 1
                users_counters[user_id] = counter
            new_once_a_month = []
            for user_id, count in users_counters.items():
                if count == 1:
                    new_once_a_month.append(user_id)
            for user_id in tqdm(sorted(new_once_a_month)):
                self.print_a_user(user_id, start_date, end_date, options['target'])

        if options['target'] == 'once':
            visits_by_once_a_month = set(
                Visit.objects
                .filter(
                    user__date_joined__lt=start_date,
                    datetime__date__gte=start_date,
                    datetime__date__lt=end_date
                )
                .values_list('user_id', 'datetime__day')
                .order_by('datetime')
            )
            users_counters = {}
            for user_id, _ in visits_by_once_a_month:
                counter = users_counters.get(user_id, 0)
                counter += 1
                users_counters[user_id] = counter
            once_a_month = []
            for user_id, count in users_counters.items():
                if count == 1:
                    once_a_month.append(user_id)
            for user_id in tqdm(sorted(once_a_month)):
                self.print_a_user(user_id, start_date, end_date, options['target'])

    def print_a_user(self, user_id, start_date, end_date, target):
        data = []

        for model, name, field, user_field, add_kwargs in [
            (Visit, 'Visit', 'datetime', 'user_id', {}),
            (Status, 'Status', 'datetime', 'user_id', {}),
            (CarouselRating, 'CarouselRating', 'datetime', 'user_id', {}),
            (RecommendationsVisit, 'RecommendationsVisit', 'datetime', 'user_id', {}),
            (RecommendedGameVisit, 'RecommendedGameVisit', 'datetime', 'user_id', {}),
            (RecommendedGameAdding, 'RecommendedGameAdding', 'datetime', 'user_id', {}),
            (RecommendedGameStoreVisit, 'RecommendedGameStoreVisit', 'datetime', 'user_id', {}),
            (Review, 'Review', 'created', 'user_id', {}),
            (Discussion, 'Discussion', 'created', 'user_id', {}),
            (Collection, 'Collection', 'created', 'creator_id', {}),
            (CollectionGame, 'CollectionGame', 'added', 'collection__creator_id', {}),
            (CommentCollectionFeed, 'CommentCollectionFeed', 'created', 'user_id', {}),
            (CommentDiscussion, 'CommentDiscussion', 'created', 'user_id', {}),
            (CommentReview, 'CommentReview', 'created', 'user_id', {}),
            (UserFollowElement, 'UserFollowElement', 'added', 'user_id', {}),
            (ImportLog, 'ImportLog', 'date', 'user_id', {'is_sync': False}),
        ]:
            kwargs = {
                user_field: user_id,
                f'{field}__date__gte': start_date,
                f'{field}__date__lt': end_date,
            }
            if add_kwargs:
                kwargs.update(add_kwargs)
            for when in model.objects.filter(**kwargs).values_list(field, flat=True):
                data.append((name, when))

        first = []
        second = []
        for name, when in sorted(data, key=lambda x: x[1]):
            first.append(name)
            second.append(when)

        with open(f'{target}.csv', 'a') as f:
            w = csv.writer(f)
            w.writerow([user_id])
            w.writerow(first)
            w.writerow(second)
