from datetime import timedelta
from hashlib import md5

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import JSONField
from django.core.validators import MaxValueValidator
from django.db import models
from django.db.models import Count, Prefetch, Sum
from django.utils.functional import cached_property
from django.utils.timezone import now

from apps.common.cache import CommonContentType
from apps.common.utils import get_share_image_url
from apps.games.models import CollectionFeed, Game, GameStore
from apps.utils.lang import get_languages, get_languages_condition, get_site_by_current_language
from apps.utils.models import HiddenManager, HiddenModel, LanguageHiddenModel
from apps.utils.strings import bare_text, safe_text
from apps.utils.upload import upload_to


class Reaction(models.Model):
    title = models.CharField(max_length=100)  # todo rename to name
    positive = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = 'Reaction'
        verbose_name_plural = 'Reactions'
        ordering = ('id',)

    def __str__(self):
        return self.title


class ReviewManager(HiddenManager):
    def visible(self):
        return self.get_queryset().filter(hidden=False, user__isnull=False)

    def visible_with_empty_users(self):
        return self.get_queryset().filter(hidden=False)

    def popular_base(self, request):
        qs = self.visible().filter(
            is_text=True,
            created__gte=now() - timedelta(days=10),
            likes_rating__gte=0,
        )
        if not request.user.is_authenticated:
            qs = qs.filter(language=request.LANGUAGE_CODE_ISO3)
        return qs

    def popular_count(self, request):
        return self.popular_base(request).count()

    def popular(self, request):
        return self.popular_base(request) \
            .annotate(lang=get_languages_condition(request)) \
            .prefetch_related(
                'reactions',
                Prefetch('user', queryset=get_user_model().objects.defer_all()),
                Prefetch('game', queryset=Game.objects.defer_all())) \
            .order_by('lang', '-likes_positive', '-id')

    def following_base(self, users):
        return (
            self.visible()
            .filter(
                is_text=True,
                created__gte=now() - timedelta(days=30),
                user_id__in=users
            )
        )

    def following(self, request, users):
        return (
            self.following_base(users)
            .annotate(lang=get_languages_condition(request))
            .prefetch_related(
                'reactions',
                Prefetch('user', queryset=get_user_model().objects.defer_all()),
                Prefetch('game', queryset=Game.objects.defer_all())
            )
            .order_by('lang', '-id')
        )

    def following_count(self, users):
        return self.following_base(users).count()

    def games_and_users_top(self, start, end, count=5):
        base_qs = self.visible().filter(created__gte=start, created__lt=end)
        games = base_qs.values('game').annotate(count=Count('id'), sum=Sum('rating')).order_by('-count', '-sum')
        users = base_qs.values('user').annotate(count=Count('id'), sum=Sum('rating')).order_by('-count', '-sum')
        return list(games.values_list('game_id', flat=True)[0:count]), games.count(), users.count()

    def list(self):
        return self.visible().filter(is_text=True).prefetch_related(
            'reactions',
            Prefetch('user', queryset=get_user_model().objects.defer_all()),
            Prefetch('game', queryset=Game.objects.defer_all())
        )


def external_user_avatar(instance, filename):
    return upload_to('external_avatars', instance, filename, False)


class Review(LanguageHiddenModel):
    RATING_SKIP = 1
    RATING_MEH = 3
    RATING_RECOMMENDED = 4
    RATING_EXCEPTIONAL = 5
    RATINGS = (
        (RATING_EXCEPTIONAL, 'exceptional'),
        (RATING_RECOMMENDED, 'recommended'),
        (RATING_MEH, 'meh'),
        (RATING_SKIP, 'skip'),
    )
    POSITIVE = (RATING_RECOMMENDED, RATING_EXCEPTIONAL)
    NEGATIVE = (RATING_SKIP, RATING_MEH)

    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='reviews', null=True)
    game = models.ForeignKey(Game, models.CASCADE, related_name='reviews')
    title = models.CharField(max_length=100, blank=True, default='')
    text = models.TextField(blank=True)
    text_safe = models.TextField(blank=True, editable=False)
    text_bare = models.TextField(blank=True, editable=False)
    text_preview = models.TextField(blank=True, editable=False)
    text_previews = JSONField(null=True, blank=True, editable=False)
    text_attachments = models.PositiveIntegerField(default=0, editable=False)
    rating = models.PositiveIntegerField(choices=RATINGS)
    reactions = models.ManyToManyField(Reaction, blank=True)
    created = models.DateTimeField(auto_now_add=True, db_index=True)
    edited = models.DateTimeField(auto_now=True)
    is_text = models.BooleanField(default=False, db_index=True)
    is_zen = models.BooleanField(default=False, db_index=True)
    likes_fake = models.IntegerField(default=0)
    likes_count = models.PositiveIntegerField(default=0, editable=False)
    likes_positive = models.PositiveIntegerField(default=0, db_index=True, editable=False)
    likes_rating = models.IntegerField(default=0, db_index=True, editable=False)
    posts_count = models.PositiveIntegerField(default=0, editable=False)
    comments_count = models.PositiveIntegerField(default=0, editable=False)
    comments_parent_count = models.PositiveIntegerField(default=0, editable=False)
    comments_attached = JSONField(null=True, blank=True, editable=False)

    external_store = models.ForeignKey(GameStore, on_delete=models.SET_NULL, null=True, editable=False)
    external_lang = models.TextField(blank=True, default='', editable=False)
    external_author = models.TextField(blank=True, default='', editable=False)
    external_source = models.URLField(max_length=500, blank=True, default='')
    external_avatar = models.FileField(upload_to=external_user_avatar, max_length=1000, blank=True, null=True)

    objects = ReviewManager()
    language_fields = ('text_bare',)
    init_fields = ('hidden', 'rating', 'likes_fake', 'is_text')

    class Meta:
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
        ordering = ('-id',)
        unique_together = ('user', 'game')

    def __str__(self):
        return str(self.id)

    def save(self, *args, **kwargs):
        self.text_safe = safe_text(self.text)
        self.text_bare, self.text_preview, self.text_previews, self.text_attachments = bare_text(self.text_safe)
        self.is_text = bool(self.text_bare.strip())
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return '{}://{}/reviews/{}'.format(settings.SITE_PROTOCOL, get_site_by_current_language().name, self.id)

    @cached_property
    def share_name(self):
        return md5('{}#{}'.format(self.id, self.rating).encode('utf-8')).hexdigest()

    @cached_property
    def share_folder(self):
        return self.share_name[0:3]

    @cached_property
    def share_image(self):
        return get_share_image_url(self, 'api_image:review')

    def get_attached_comments(self, request):
        if not self.comments_attached:
            return []
        for lang in get_languages(request):
            if lang in self.comments_attached:
                return self.comments_attached[lang]
        return self.comments_attached.get('common', [])

    def get_context(self, request):
        return self.get_many_context([self], request, False)

    @classmethod
    def get_many_context(cls, reviews, request=None, comments=True, posts=True):
        context = {}
        if request and reviews:
            if comments:
                ids = []
                for review in reviews:
                    ids += review.get_attached_comments(request)
                comment_model = cls.comments.field.model
                context['reviews_comments'] = comment_model.objects \
                    .prefetch_related(Prefetch('user', queryset=get_user_model().objects.defer_all())) \
                    .in_bulk(ids)
                if request.user.is_authenticated and context['reviews_comments']:
                    context.update(comment_model.get_many_context(list(context['reviews_comments'].values()), request))
            if request.user.is_authenticated:
                ids = [review.id for review in reviews]
                context['reviews_users_likes'] = dict(Like.objects
                                                      .filter(review_id__in=ids, user_id=request.user.id)
                                                      .values_list('review_id', 'positive'))
                if posts:
                    kwargs = {
                        'content_type_id': CommonContentType().get(cls).id,
                        'object_id__in': ids,
                        'collection__creator_id': request.user.id,
                    }
                    context['reviews_review_users_posts'] = CollectionFeed.objects.filter(**kwargs) \
                        .values_list('object_id', flat=True)
        return context


class Like(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    review = models.ForeignKey(Review, models.CASCADE, related_name='likes')
    positive = models.BooleanField(default=True, db_index=True)
    added = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Like'
        verbose_name_plural = 'Likes'
        unique_together = ('user', 'review')

    def __str__(self):
        return str(self.id)


class Versus(models.Model):
    MIN_RATING = 0

    game = models.ForeignKey(Game, models.CASCADE)
    review_first = models.ForeignKey(Review, models.CASCADE, related_name='+')
    review_second = models.ForeignKey(Review, models.CASCADE, related_name='+')

    class Meta:
        verbose_name = 'Versus'
        verbose_name_plural = 'Versus'

    def __str__(self):
        return str(self.id)

    @classmethod
    def position(cls, review, invert=False):
        if review.rating in (Review.POSITIVE if not invert else Review.NEGATIVE):
            return 'review_first'
        return 'review_second' if not invert else 'review_first'

    @classmethod
    def opposite(cls, review):
        return Review.POSITIVE if review.rating in Review.NEGATIVE else Review.NEGATIVE

    @classmethod
    def get_many_context(cls, records, request=None):
        context = {}
        reviews = []
        for record in records:
            reviews.append(record.review_first_id)
            reviews.append(record.review_second_id)
        context['versus_reviews'] = Review.objects.prefetch_related('reactions', 'user').in_bulk(reviews)
        context.update(Review.get_many_context(context['versus_reviews'].values(), request, False))
        return context


class EditorialReview(HiddenModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, models.SET_NULL, related_name='editorial_reviews', blank=True, null=True
    )
    game = models.OneToOneField(Game, models.CASCADE, related_name='editorial_review')
    text = models.TextField(blank=True)
    rating = models.PositiveSmallIntegerField(validators=[MaxValueValidator(100)])
    created = models.DateTimeField()
    display_name = models.CharField(max_length=100, blank=True, default='')
    original_username = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        verbose_name = 'Editorial Review'
        verbose_name_plural = 'Editorial Reviews'
        ordering = ('-id',)

    def __str__(self):
        return str(self.id)
