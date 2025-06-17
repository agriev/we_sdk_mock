from datetime import timedelta
from difflib import SequenceMatcher
from math import ceil

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError, models, transaction
from django.db.models import Avg, ExpressionWrapper, F, IntegerField
from django.utils.timezone import now
from psycopg2 import errorcodes

from apps.common.cache import CommonContentType
from apps.games import models as game_models
from apps.merger.cache import AvgDurations
from apps.utils.fields.autoslug import CIAutoSlugField

MAX_SIMILARITY = 0.85


class StoreAdd(models.Model):
    game = models.ForeignKey(game_models.Game, models.CASCADE)
    date = models.DateTimeField(auto_now_add=True)
    stores_was = models.ManyToManyField(game_models.Store, related_name='+')
    store_add = models.ForeignKey(game_models.Store, models.CASCADE, related_name='+')

    class Meta:
        verbose_name = 'Add Store'
        verbose_name_plural = 'Add Stores'

    def __str__(self):
        return str(self.id)


class SimilarGame(models.Model):
    first_game = models.ForeignKey(game_models.Game, models.CASCADE, related_name='+')
    second_game = models.ForeignKey(game_models.Game, models.CASCADE, related_name='+')
    date = models.DateTimeField(auto_now_add=True)
    is_ignored = models.BooleanField(default=False)
    selected_game = models.PositiveIntegerField(default=None, null=True)

    class Meta:
        verbose_name = 'Similar Game'
        verbose_name_plural = 'Similar Games'
        unique_together = ('first_game', 'second_game')

    def __str__(self):
        return str(self.id)

    @transaction.atomic
    def merge(self, main_id=False, user_id=None):
        from apps.merger.tasks import merge_games
        transaction.on_commit(lambda: merge_games.delay(self.id, user_id))
        self.selected_game = main_id
        self.save()

    @staticmethod
    def check_games(id1, name1, id2, name2):
        if id1 == id2:
            return False
        sequence = SequenceMatcher(a=name1.lower(), b=name2.lower())
        if sequence.quick_ratio() > MAX_SIMILARITY and sequence.ratio() > MAX_SIMILARITY:
            first = id1
            second = id2
            if id2 < id1:
                first = id2
                second = id1
            return first, second
        return False

    @classmethod
    def write_games(cls, similar):
        for first, second in similar:
            try:
                cls.objects.get_or_create(first_game_id=first, second_game_id=second)
            except IntegrityError as e:
                if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                    raise


class Network(models.Model):
    name = models.CharField(max_length=250)
    slug = CIAutoSlugField(populate_from='name', unique=True)

    class Meta:
        verbose_name = 'Network'
        verbose_name_plural = 'Networks'

    def __str__(self):
        return self.name


class ImportLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='+')
    network = models.ForeignKey(Network, models.CASCADE)
    account = models.CharField(max_length=200)
    status = models.CharField(max_length=50)
    date = models.DateTimeField(db_index=True)
    duration = models.PositiveIntegerField(default=0)  # seconds
    is_sync = models.BooleanField(default=False)
    is_sync_old = models.BooleanField(default=False)
    skip_auto_now = False

    class Meta:
        ordering = ('-date',)
        verbose_name = 'Import log'
        verbose_name_plural = 'Import logs'

    def __str__(self):
        return str(self.id)

    def save(self, *args, **kwargs):
        if not self.skip_auto_now:
            self.date = now()
        super().save(*args, **kwargs)

    @classmethod
    def avg_durations(cls):
        networks = Network.objects.values_list('slug', flat=True)
        durations = {}
        period = now() - timedelta(hours=24)
        qs = cls.objects.exclude(duration=0, is_sync=True).filter(date__gte=period, status='ready')
        for network in networks:
            durations[network] = ceil(
                qs.filter(network__slug=network).aggregate(Avg('duration'))['duration__avg'] or 0
            )
        return durations


# class Raptr(models.Model):
#     name = models.CharField(max_length=100)
#     platform = models.ForeignKey('games.Platform', models.CASCADE, blank=True, default=None, null=True)
#
#     class Meta:
#         verbose_name = 'Raptr'
#         verbose_name_plural = 'Raptr'
#
#     def __str__(self):
#         return self.name


class Import(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='+')
    date = models.DateTimeField(db_index=True)
    is_sync = models.BooleanField(default=True)
    is_fast = models.IntegerField(default=0, help_text='In days')
    is_old = models.BooleanField(default=False)
    is_manual = models.BooleanField(default=True)
    is_started = models.BooleanField(default=False)
    retries = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('id',)
        verbose_name = 'Import'
        verbose_name_plural = 'Imports'

    def __str__(self):
        return str(self.id)

    @classmethod
    def position_in_queue(cls, user_id):
        position = cls.objects.only('id').filter(user_id=user_id).first()
        if position:
            processes = len(settings.RUN_IMPORTS)
            return ceil(cls.objects.filter(is_sync=False, id__lte=position.id).count() / processes)
        return 0

    @classmethod
    def approximate_seconds(cls, position_in_queue):
        if position_in_queue:
            middle_duration = 30
            durations = AvgDurations().get()
            middle_duration = max(durations.values()) if durations else middle_duration
            return position_in_queue * middle_duration
        return 0

    @classmethod
    def import_qs(cls, processes, process_num, is_sync):
        mod = ExpressionWrapper((F('id') + F('retries')) % processes, output_field=IntegerField())
        return cls.objects.annotate(mod=mod).filter(mod=process_num, date__lte=now(), is_sync=is_sync).order_by('id')


class MergedSlug(models.Model):
    old_slug = models.SlugField(max_length=100)
    new_slug = models.SlugField(db_index=False)
    content_type = models.ForeignKey(ContentType, models.CASCADE, db_index=False)
    manual = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Merged slug'
        verbose_name_plural = 'Merged slugs'
        unique_together = ('old_slug', 'content_type')

    def __str__(self):
        return '{0} - {1}'.format(self.old_slug, self.new_slug)

    @classmethod
    def save_merged_slugs(cls, item_from_slug, item_slug, instance):
        """Chooses and saves more suitable of game slugs after game merging."""
        new_slug, old_slug = min(item_from_slug, item_slug, key=len), max(item_from_slug, item_slug, key=len)
        if new_slug == old_slug:
            new_slug, old_slug = item_from_slug, item_slug  # For cases when slugs have the same length
        obj, created = cls.objects.get_or_create(
            old_slug=old_slug, content_type=CommonContentType().get(instance), defaults={'new_slug': new_slug}
        )
        if not created:
            obj.new_slug = new_slug
            obj.save(update_fields=['new_slug'])
        return new_slug, old_slug

    @classmethod
    def rewrite_merged_slugs(cls, new_slug, old_slug, instance):
        """Checks that the old slug has an existing instance as a new slug and replace it with an actual new slug."""
        exists_old_slugs = cls.objects.filter(
            new_slug=old_slug,
            content_type=CommonContentType().get(instance)
        )
        for slug_obj in exists_old_slugs:
            slug_obj.new_slug = new_slug
            try:
                with transaction.atomic():
                    slug_obj.save(update_fields=['new_slug'])
            except IntegrityError as e:
                if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                    raise
                slug_obj.delete()


class DeletedGame(models.Model):
    game_name = models.CharField(max_length=200)

    class Meta:
        verbose_name = 'Deleted Game'
        verbose_name_plural = 'Deleted Games'

    def __str__(self):
        return '{}'.format(self.game_name)
