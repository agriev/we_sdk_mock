from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Case, IntegerField, Sum, When
from psycopg2 import errorcodes

from apps.celery import app as celery
from apps.games.models import Game
from apps.reviews.models import Review, Versus
from apps.utils.api import get_object_or_none
from apps.utils.celery import lock_transaction
from apps.utils.tasks import detect_language

versus_update_lock_template = 'apps.reviews.tasks:versus:{}'


@celery.task(time_limit=60, bind=True, ignore_result=True, max_retries=60, acks_late=True, reject_on_worker_lost=True)
def update_review(self, review_id, text_changed, likes_fake, is_update_versus):
    from apps.feed.signals import MODELS_OPTIONS

    try:
        review = Review.objects.only('id', 'game_id').get(id=review_id)
    except Review.DoesNotExist:
        return
    # save a language
    if text_changed:
        detect_language(review_id, review._meta.app_label, review._meta.model_name,
                        MODELS_OPTIONS[Review]['language'](review))
        is_update_versus = True
    # add fake likes
    if likes_fake:
        update_likes_totals(review_id)  # it will update the versus
    # update the versus
    elif is_update_versus:
        with lock_transaction(versus_update_lock_template.format(review.game_id), self.app.oid) as acquired:
            if not acquired:
                self.retry(countdown=1, args=(review_id, False, False, True))
            versus_update_internal(review, True, review.game)


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_reviews_totals(game_id, ratings=False, reactions=False):
    with transaction.atomic():
        try:
            game = Game.objects.select_for_update().only('id').get(id=game_id)
        except Game.DoesNotExist:
            return
        fields = []
        if ratings:
            game.update_ratings()
            fields += [
                'rating', 'rating_avg', 'rating_top', 'ratings',
                'reviews_text_counts', 'reviews_text_count_all', 'ratings_count'
            ]
        if reactions:
            game.update_reactions()
            fields.append('reactions')
        game.save(update_fields=fields)


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_likes_totals(review_id):
    from apps.reviews.signals import review_fields_updated

    try:
        review = Review.objects.only('id', 'likes_fake', 'likes_rating').get(id=review_id)
    except Review.DoesNotExist:
        return
    review.likes_count = review.likes.count() + abs(review.likes_fake)
    review.likes_positive = (
        review.likes.filter(positive=True).count() + (review.likes_fake if review.likes_fake > 0 else 0)
    )
    condition = Sum(Case(When(positive=False, then=-1), default=1, output_field=IntegerField()))
    review.likes_rating = (review.likes.aggregate(result=condition)['result'] or 0) + review.likes_fake
    try:
        review.save(update_fields=['likes_count', 'likes_positive', 'likes_rating'])
        review_fields_updated.send(
            sender=review.__class__,
            pk=review_id,
            fields_was={'likes_positive': review.likes_positive},
            fields={'likes_positive': review.likes_positive}
        )
    except (DatabaseError, Review.DoesNotExist):
        # Save with update_fields did not affect any rows.
        pass


def versus_update_internal(review, delete, game):
    if review and delete:
        try:
            Versus.objects.filter(**{Versus.position(review): review}).delete()
        except Review.DoesNotExist:
            pass

    existed = []
    for versus in Versus.objects.filter(game=game):
        existed.append(versus.review_first_id)
        existed.append(versus.review_second_id)
    data = game.reviews.exclude(id__in=existed) \
        .filter(likes_rating__gte=Versus.MIN_RATING, is_text=True, hidden=False) \
        .values_list('id', 'rating', 'language')
    languages = {}
    for pk, rating, language in data:
        if not languages.get(language):
            languages[language] = {
                'positive': [],
                'negative': [],
            }
        if rating in Review.POSITIVE:
            languages[language]['positive'].append(pk)
        elif rating in Review.NEGATIVE:
            languages[language]['negative'].append(pk)
    for language, values in languages.items():
        for i in range(0, min(len(values['positive']), len(values['negative']))):
            Versus.objects.get_or_create(game=game, review_first_id=values['positive'][i],
                                         review_second_id=values['negative'][i])


@celery.task(time_limit=120, bind=True, ignore_result=True, max_retries=120)
def versus_update(self, review_id, game_id=None, delete=False):
    review = None
    if game_id and not review_id:
        game = Game.objects.get(id=game_id)
    else:
        review = get_object_or_none(Review.objects.all(), id=review_id)
        if not review:
            return
        game = review.game
    with lock_transaction(versus_update_lock_template.format(game.id), self.app.oid) as acquired:
        if not acquired:
            self.retry(countdown=1)
        versus_update_internal(review, delete, game)


@celery.task(time_limit=240, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def save_reviews(data, user_id):
    from api.reviews.serializers import ReviewSerializer

    validated_data = []

    for game in data:
        serializer = ReviewSerializer(data=game)
        serializer.is_valid(raise_exception=True)
        validated_data.append(serializer.validated_data)

    for game in validated_data:
        game.pop('add_to_library')
        try:
            with transaction.atomic():
                Review.objects.create(user_id=user_id, **game)
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
            obj = Review.objects.get(user_id=user_id, game_id=game['game'])
            obj.rating = game['rating']
            obj.save(update_fields=['rating'])
