from collections import OrderedDict

from django.conf import settings
from django.contrib.postgres.fields import ArrayField, CICharField, JSONField
from django.db import models, transaction
from django.db.models import Count, Sum
from django.db.models.functions import ExtractYear
from django.utils.functional import cached_property
from django.utils.timezone import now
from django_cache_dependencies import get_cache
from ordered_model.models import OrderedModel

from api.games import formats as games_formats
from apps.games.cache import GameMinYear
from apps.games.models import Game
from apps.reviews.models import Review
from apps.utils.fields.autoslug import CIAutoSlugField
from apps.utils.gender import detect_gender
from apps.utils.lang import get_site_by_current_language
from apps.utils.models import HiddenManager, HiddenModel, MergeModel
from apps.utils.strings import markdown
from apps.utils.translite import translite_ru
from apps.utils.upload import upload_to


def person_image(instance, filename):
    return upload_to('persons', instance, filename, False)


def person_image_wiki(instance, filename):
    return upload_to('persons_wiki', instance, filename, False)


class PersonManager(HiddenManager):
    defer_always_fields = {
        'on_main',
        'on_main_added',
    }
    defer_list_fields = {
        'description',
        'description_wiki',
        'link',
        'wikibase_id',
        'statistics',
    }

    @cached_property
    def defer_all_fields(self):
        return self.defer_always_fields | self.defer_list_fields

    def defer_all(self, *exclude):
        defer = self.defer_all_fields
        if exclude:
            defer = self.defer_all_fields.difference(exclude)
        return self.get_queryset().defer(*defer)


class Person(HiddenModel, MergeModel):
    GENDER_MALE = 'm'
    GENDER_FEMALE = 'f'
    GENDER_UNKNOWN = 'u'
    GENDERS = (
        (GENDER_MALE, 'Male'),
        (GENDER_FEMALE, 'Female'),
        (GENDER_UNKNOWN, 'Unknown'),
    )

    name = CICharField(max_length=200, unique=True, editable=False)
    display_name = models.CharField(max_length=100, blank=True, default='')
    slug = CIAutoSlugField(populate_from='name', editable=False, unique=True)
    gender = models.CharField(choices=GENDERS, default=GENDER_UNKNOWN, max_length=1)
    description = models.TextField(blank=True, default='')
    description_wiki = models.TextField(blank=True, default='', editable=False)
    auto_description = models.TextField(blank=True, default='')
    link = models.CharField(max_length=200, blank=True, default='', editable=False)
    wikibase_id = CICharField(max_length=50, blank=True, default=None, null=True, editable=False)
    positions = ArrayField(models.PositiveIntegerField(), default=list, editable=False)
    top_games = ArrayField(models.PositiveIntegerField(), default=list, editable=False)
    games_count = models.PositiveIntegerField(default=0, editable=False)
    games_added = models.PositiveIntegerField(default=0, editable=False)
    reviews_count = models.PositiveIntegerField(default=0, editable=False)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0, editable=False)
    rating_top = models.PositiveIntegerField(default=0, editable=False)
    statistics = JSONField(null=True, blank=True, editable=False)
    image = models.FileField(upload_to=person_image, null=True, blank=True)
    image_wiki = models.FileField(upload_to=person_image_wiki, null=True, blank=True, editable=False)
    image_background = models.URLField(max_length=500, null=True, blank=True, editable=False)
    on_main = models.BooleanField(default=False, db_index=True)
    on_main_added = models.DateTimeField(null=True, blank=True, default=None, db_index=True)
    updated = models.DateTimeField(null=True, blank=True, default=None, db_index=True)

    objects = PersonManager()
    save_slugs = True
    init_fields = ('hidden', 'name', 'display_name', 'gender')

    class Meta:
        ordering = ('-games_added',)
        verbose_name = 'Person'
        verbose_name_plural = 'Persons'

    def save(self, *args, **kwargs):
        clear_cache = False
        if self.on_main and not self.on_main_added:
            self.on_main_added = now()
            clear_cache = True
        if self.on_main_added and not self.on_main:
            self.on_main_added = None
            clear_cache = True
        if clear_cache:
            get_cache().invalidate_tags('credits.persons.main')
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return '{}://{}/creators/{}'.format(settings.SITE_PROTOCOL, get_site_by_current_language().name, self.slug)

    @property
    def visible_name(self):
        return self.display_name_en or self.name

    @property
    def visible_description(self):
        if self.description:
            return markdown(self.description)
        if self.auto_description:
            return markdown(self.auto_description)
        return self.description_wiki

    @property
    def visible_image(self):
        return self.image or self.image_wiki

    def copy_in_parent(self, parent):
        for game_person in GamePerson.objects.filter(person_id=self.id):
            if GamePerson.objects.filter(
                person_id=parent.id, game_id=game_person.game_id, position_id=game_person.position_id
            ).count():
                continue
            game_person.person_id = parent.id
            game_person.save(update_fields=['person_id'])
        if self.wikibase_id and not parent.wikibase_id:
            parent.wikibase_id = self.wikibase_id
        from apps.credits.tasks import update_person
        transaction.on_commit(lambda: update_person.delay(parent.id))

    def get_context(self, request):
        return self.get_many_context([self], request, games=False)

    def detect_gender(self):
        name = self.visible_name.strip().split(' ')[0]
        gender = detect_gender(name)
        Person.objects.filter(id=self.id).update(gender=gender)

    def write_foreign_names(self):
        name_ru = translite_ru(self.visible_name.strip())[0:100]
        Person.objects.filter(id=self.id).update(display_name_ru=name_ru)

    def set_statistics(self, targets=None):
        if not self.statistics:
            self.statistics = {}
        fields = []
        ids = GamePerson.objects.visible().filter(person=self).values_list('game_id', flat=True)
        games = Game.objects.only('id').prefetch_related('platforms', 'developers', 'genres').filter(id__in=ids)
        if not targets or 'games' in targets:
            qs = self.gameperson_set.visible().values('game_id').annotate(count=Count('id')).order_by('-game__added')
            self.games_count = qs.count()
            self.games_added = qs.aggregate(Sum('game__added'))['game__added__sum'] or 0
            self.top_games = list(qs.values_list('game_id', flat=True)[0:30])
            if self.games_count:
                self.image_background = Game.objects.only('image_background', 'image') \
                    .get(id=self.top_games[0]).background_image_full

            positions = set()
            for position_id in self.gameperson_set.visible().values_list('position_id', flat=True):
                positions.add(position_id)
            self.positions = list(positions)

            years = OrderedDict()
            min_year = GameMinYear().get()
            max_year = now().year
            get_years = Game.objects \
                .filter(id__in=ids) \
                .annotate(released_year=ExtractYear('released')) \
                .filter(released_year__gt=1900, released_year__lte=max_year) \
                .values_list('released_year') \
                .annotate(count=Count('id')) \
                .order_by('released_year')
            if get_years:
                min_year = min(min_year, min([x[0] for x in get_years]))
            for year in range(min_year, max_year + 1):
                years[year] = {
                    'year': year,
                    'count': 0,
                }
            for year, count in get_years:
                years[year]['count'] = count
            self.statistics['years'] = list(years.values())

            fields += ['statistics', 'games_count', 'games_added', 'top_games', 'positions', 'image_background']
        if not targets or 'ratings' in targets:
            ratings = {}
            total = 0
            reviews = Review.objects.visible().filter(game_id__in=ids).values_list('rating', flat=True)
            for review in reviews:
                ratings[review] = (ratings.get(review) or 0) + 1
                total += review
            self.statistics['ratings'] = ratings
            self.reviews_count = reviews.count()
            self.rating = total / self.reviews_count if self.reviews_count else 0
            top = {'rating': 0, 'value': 0}
            for num, value in self.statistics['ratings'].items():
                if value > top['value'] or (value == top['value'] and num > top['rating']):
                    top['rating'] = num
                    top['value'] = value
            self.rating_top = top['rating']
            fields += ['statistics', 'reviews_count', 'rating', 'rating_top']
        if not targets or 'platforms' in targets:
            self.statistics['games_platforms'] = games_formats.percents(games, 'platforms', 'platform', 'id')
            fields += ['statistics']
        if not targets or 'developers' in targets:
            self.statistics['games_developers'] = games_formats.percents(games, 'developers', 'developer', 'id', True)
            fields += ['statistics']
        if not targets or 'genres' in targets:
            self.statistics['games_genres'] = games_formats.percents(games, 'genres', 'genre', 'id', True)
            fields += ['statistics']
        if fields:
            update = {}
            for field in fields:
                update[field] = getattr(self, field)
            Person.objects.filter(id=self.id).update(**update)

    @classmethod
    def get_top_games(cls, persons, except_game_id=None, games_count=3, for_view=False):
        ids = []
        persons_games = {}
        for person in persons:
            games = []
            for game_id in person.top_games or []:
                if len(games) == games_count:
                    break
                if game_id == except_game_id:
                    continue
                games.append(game_id)
                ids.append(game_id)
            persons_games[person.id] = games
        if for_view:
            games = Game.objects.only_short().in_bulk(ids)
        else:
            games = Game.objects.defer_all().in_bulk(ids)
        result = {}
        for person_id, games_ids in persons_games.items():
            result[person_id] = [games[pk] for pk in games_ids if games.get(pk)]
        return result, games

    @classmethod
    def get_many_context(cls, persons, request, games=True, game_positions=None, backgrounds=None,
                         except_game_id=None, games_count=3, for_view=False):
        context = {}

        positions = set()
        if game_positions:
            for person in persons:
                for position_id in game_positions[person.id]:
                    positions.add(position_id)
        else:
            game_positions = {}
            for person in persons:
                if not person.positions:
                    continue
                person_positions = set()
                for position_id in person.positions:
                    positions.add(position_id)
                    person_positions.add(position_id)
                game_positions[person.id] = person_positions
        context['persons_positions_games'] = game_positions
        context['persons_positions'] = Position.objects.in_bulk(positions)

        if games:
            persons_games, games = cls.get_top_games(persons, except_game_id, games_count, for_view=for_view)
            context['persons_games'] = persons_games
            if not for_view:
                context.update(Game.get_many_context(games.values(), request))

        if backgrounds:
            total = len(backgrounds)
            images = {}
            for i, person in enumerate(persons):
                images[person.id] = backgrounds[i % total]['image']
            context['persons_backgrounds'] = images

        return context


class Position(OrderedModel):
    name = CICharField(max_length=200, unique=True)
    slug = CIAutoSlugField(populate_from='name', unique=True, editable=False)
    wikibase_id = CICharField(max_length=50, blank=True, default=None, null=True)
    name_ru_genitive = models.CharField(max_length=200, default='')

    class Meta(OrderedModel.Meta):
        verbose_name = 'Position'
        verbose_name_plural = 'Positions'

    def __str__(self):
        return self.name


class GamePerson(HiddenModel):
    game = models.ForeignKey(Game, models.CASCADE)
    person = models.ForeignKey(Person, models.CASCADE)
    position = models.ForeignKey(Position, models.CASCADE)

    init_fields = ('hidden', 'person_id', 'game_id')

    class Meta:
        ordering = ('position__order', 'person__name')
        verbose_name = 'Game Person'
        verbose_name_plural = 'Game Persons'
        unique_together = ('game', 'person', 'position')

    def __str__(self):
        return str(self.id)
