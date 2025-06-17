import operator
from datetime import timedelta

from django.db import IntegrityError, models, transaction
from django.db.models import Count
from django.db.models.functions import ExtractYear
from django.utils.timezone import now
from psycopg2 import errorcodes

from apps.credits.models import Person
from apps.games.models import Game, Genre
from apps.reviews.models import Review
from apps.users.models import UserGame
from apps.utils.dates import monday


class ChartMixin(object):
    chart_name = 'full'

    @classmethod
    def calculate_qs(cls, week, limit_date=False):
        qs = UserGame.objects.visible()
        if limit_date:
            qs = qs.filter(added__lt=week)
        return qs

    @classmethod
    def calculate(cls, week, limit_date=False, **kwargs):
        return cls.calculate_qs(week, limit_date).values_list('game_id').annotate(count=Count('game_id')) \
            .values_list('game_id', 'count').order_by('-count', '-game_id')

    @classmethod
    def write(cls, game_count, week, save_game=True):
        objects = []
        for position, (game_id, count) in enumerate(game_count):
            objects.append(cls(game_id=game_id, position=position, count=count, week=week))
            if save_game:
                with transaction.atomic():
                    charts = Game.objects.values_list('charts', flat=True).get(id=game_id) or {}
                    charts[cls.chart_name] = position
                    Game.objects.filter(id=game_id).update(charts=charts)
        cls.objects.bulk_create(objects)
        return len(objects)

    @classmethod
    def calculate_and_write(cls, week, limit_date=False, save_game=False, **kwargs):
        if not limit_date:
            cls.objects.filter(week=week).delete()
        return cls.write(cls.calculate(week, limit_date, **kwargs), week, save_game)

    @classmethod
    def rebuild(cls, *args, **kwargs):
        cls.objects.filter(**kwargs).delete()
        delta = timedelta(days=7)
        try:
            start = monday(UserGame.objects.values_list('created', flat=True).earliest('created'))
        except UserGame.DoesNotExist:
            return
        while start <= now():
            last = start + delta > now()
            prev_last = start + delta + delta > now()
            cls.calculate_and_write(start, True, last or prev_last, **kwargs)
            start += delta


class GameFull(ChartMixin, models.Model):
    id = models.BigAutoField(primary_key=True)
    game = models.ForeignKey(Game, models.CASCADE)
    position = models.PositiveIntegerField()
    count = models.PositiveIntegerField()
    week = models.DateTimeField()

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Game full'
        verbose_name_plural = 'Games full'

    @classmethod
    def calculate_qs(self, week, limit_date=False):
        qs = Review.objects.visible()
        if limit_date:
            qs = qs.filter(created__lt=week, edited__lt=week)
        return qs

    @classmethod
    def calculate(self, week, limit_date=False, **kwargs):
        reviews_qs = self.calculate_qs(week, limit_date)
        rating_map = {1: 1, 3: 2, 4: 3, 5: 4}

        avg_set = reviews_qs.values_list('rating', flat=True)

        if not avg_set:
            avg = 0
        else:
            avg = sum([rating_map[i] for i in avg_set]) / len(avg_set)

        games_qs = reviews_qs.values('game_id') \
            .exclude(game__parents_count__gt=0) \
            .annotate(Count('rating')) \
            .order_by('-rating__count')

        games = []
        for game in games_qs.iterator():
            game_reviews = reviews_qs.filter(game_id=game['game_id']).values_list('rating', flat=True)
            game_rating = sum([rating_map[i] for i in game_reviews]) / len(game_reviews)

            weighted_rating = (
                (float(game['rating__count'] / (game['rating__count'] + Game.RATING_TRESHOLD)) * float(
                    game_rating))
                + (float(Game.RATING_TRESHOLD / (game['rating__count'] + Game.RATING_TRESHOLD)) * float(avg))
            )
            games.append(((game['game_id']), (weighted_rating * 100000)))

        games.sort(key=operator.itemgetter(1), reverse=True)

        return games


class GameYear(ChartMixin, models.Model):
    id = models.BigAutoField(primary_key=True)
    game = models.ForeignKey(Game, models.CASCADE)
    position = models.PositiveIntegerField()
    count = models.PositiveIntegerField()
    week = models.DateTimeField()
    chart_name = 'year'

    @classmethod
    def calculate_qs(cls, week, limit_date=False):
        qs = UserGame.objects.visible().filter(game__released__year=week.year)
        if limit_date:
            qs = qs.filter(added__lt=week)
        return qs

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Game year'
        verbose_name_plural = 'Games year'


class GameToPlay(ChartMixin, models.Model):
    id = models.BigAutoField(primary_key=True)
    game = models.ForeignKey(Game, models.CASCADE)
    position = models.PositiveIntegerField()
    count = models.PositiveIntegerField()
    week = models.DateTimeField()
    chart_name = 'toplay'

    @classmethod
    def calculate_qs(cls, week, limit_date=False):
        qs = UserGame.objects.visible().filter(status=UserGame.STATUS_TOPLAY)
        if limit_date:
            qs = qs.filter(added__lt=week)
        return qs

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Game to play'
        verbose_name_plural = 'Games to play'


class GameUpcoming(ChartMixin, models.Model):
    id = models.BigAutoField(primary_key=True)
    game = models.ForeignKey(Game, models.CASCADE)
    position = models.PositiveIntegerField()
    count = models.PositiveIntegerField()
    week = models.DateTimeField()
    chart_name = 'upcoming'

    @classmethod
    def calculate_qs(cls, week, limit_date=False):
        qs = UserGame.objects.visible().filter(status=UserGame.STATUS_TOPLAY, game__released__gte=now())
        if limit_date:
            qs = qs.filter(added__lt=week)
        return qs

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Game upcoming'
        verbose_name_plural = 'Games upcoming'


class GameGenre(ChartMixin, models.Model):
    id = models.BigAutoField(primary_key=True)
    game = models.ForeignKey(Game, models.CASCADE)
    position = models.PositiveIntegerField()
    count = models.PositiveIntegerField()
    week = models.DateTimeField()
    genre = models.ForeignKey(Genre, models.CASCADE)
    chart_name = 'genre'

    @classmethod
    def calculate_genre_qs(cls, genre_id, week, limit_date=False):
        qs = UserGame.objects.visible().filter(game__genres__in=[genre_id])
        if limit_date:
            qs = qs.filter(added__lt=week)
        return qs

    @classmethod
    def calculate(cls, week, limit_date=False, **kwargs):
        result = {}
        for genre_id in Genre.objects.visible().values_list('id', flat=True):
            result[genre_id] = cls.calculate_genre_qs(genre_id, week, limit_date).values_list('game_id') \
                .annotate(count=Count('game_id')).values_list('game_id', 'count').order_by('-count', '-game_id')
        return result

    @classmethod
    def write(cls, genre_game_count, week, save_game=True):
        objects = []
        for genre_id, game_count in genre_game_count.items():
            for position, (game_id, count) in enumerate(game_count):
                objects.append(cls(game_id=game_id, position=position, count=count, week=week, genre_id=genre_id))
                if save_game:
                    charts = Game.objects.values_list('charts', flat=True).get(id=game_id)
                    if not charts:
                        charts = {}
                    if not charts.get(cls.chart_name):
                        charts[cls.chart_name] = {}
                    change = 'new'
                    genre_id = str(genre_id)
                    old_position = charts[cls.chart_name].get(genre_id)
                    if old_position:
                        if position < old_position[0]:
                            change = 'up'
                        elif position > old_position[0]:
                            change = 'down'
                        else:
                            change = 'equal'
                    charts[cls.chart_name][genre_id] = [position, change]
                    Game.objects.filter(id=game_id).update(charts=charts)
        cls.objects.bulk_create(objects)
        return len(objects)

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Game genre'
        verbose_name_plural = 'Games genre'


class GameReleased(ChartMixin, models.Model):
    id = models.BigAutoField(primary_key=True)
    game = models.ForeignKey(Game, models.CASCADE)
    position = models.PositiveIntegerField()
    count = models.PositiveIntegerField()
    week = models.DateTimeField()
    released = models.PositiveIntegerField()
    chart_name = 'released'

    @classmethod
    def calculate_released_qs(cls, released, week, limit_date=False):
        qs = UserGame.objects.visible().filter(game__released__year=released)
        if limit_date:
            qs = qs.filter(added__lt=week)
        return qs

    @classmethod
    def calculate(cls, week, limit_date=False, **kwargs):
        result = {}
        for year in UserGame.objects.visible().annotate(year=ExtractYear('game__released')).values('year') \
                .annotate(c=Count('id')).values_list('year', flat=True):
            result[year] = cls.calculate_released_qs(year, week, limit_date).values_list('game_id') \
                .annotate(count=Count('game_id')).values_list('game_id', 'count').order_by('-count', '-game_id')
        return result

    @classmethod
    def write(cls, released_game_count, week, save_game=True):
        objects = []
        for year, game_count in released_game_count.items():
            for position, (game_id, count) in enumerate(game_count):
                objects.append(cls(game_id=game_id, position=position, count=count, week=week, released=year))
                if save_game:
                    charts = Game.objects.values_list('charts', flat=True).get(id=game_id)
                    if not charts:
                        charts = {}
                    change = 'new'
                    old_position = charts.get(cls.chart_name)
                    if old_position and old_position['year'] == year:
                        if position < old_position['position']:
                            change = 'up'
                        elif position > old_position['position']:
                            change = 'down'
                        else:
                            change = 'equal'
                    charts[cls.chart_name] = {'position': position, 'change': change, 'year': year}
                    Game.objects.filter(id=game_id).update(charts=charts)
        cls.objects.bulk_create(objects)
        return len(objects)

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Game released'
        verbose_name_plural = 'Games released'


class GameCreditPerson(ChartMixin, models.Model):
    id = models.BigAutoField(primary_key=True)
    game = models.ForeignKey(Game, models.CASCADE)
    position = models.PositiveIntegerField()
    count = models.PositiveIntegerField()
    week = models.DateTimeField()
    person = models.ForeignKey(Person, models.CASCADE)
    chart_name = 'person'

    @classmethod
    def calculate_person_qs(cls, person_id, week, limit_date=False):
        qs = UserGame.objects.visible().filter(game__gameperson__person_id__in=[person_id])
        if limit_date:
            qs = qs.filter(added__lt=week)
        return qs.values_list('game_id') \
            .annotate(count=Count('game_id')) \
            .values_list('game_id', 'count') \
            .order_by('-count', '-game_id')

    @classmethod
    def calculate(cls, week, limit_date=False, **kwargs):
        result = {}
        qs = Person.objects.values_list('id', flat=True).order_by('-games_count')
        if kwargs.get('person_id'):
            qs = qs.filter(id=kwargs['person_id'])
        for person_id in qs:
            result[person_id] = cls.calculate_person_qs(person_id, week, limit_date)
        return result

    @classmethod
    def write(cls, person_game_count, week, save_game=True):
        objects = []
        for person_id, game_count in person_game_count.items():
            for position, (game_id, count) in enumerate(game_count):
                objects.append(cls(game_id=game_id, position=position, count=count, week=week, person_id=person_id))
                if save_game:
                    charts = Game.objects.values_list('charts', flat=True).get(id=game_id)
                    if not charts:
                        charts = {}
                    if not charts.get(cls.chart_name):
                        charts[cls.chart_name] = {}
                    change = 'new'
                    person_id = str(person_id)
                    old_position = charts[cls.chart_name].get(person_id)
                    if old_position:
                        if position < old_position[0]:
                            change = 'up'
                        elif position > old_position[0]:
                            change = 'down'
                        else:
                            change = 'equal'
                    charts[cls.chart_name][person_id] = [position, change]
                    Game.objects.filter(id=game_id).update(charts=charts)
        for obj in objects:
            try:
                obj.save()
            except IntegrityError as e:
                if e.__cause__.pgcode != errorcodes.FOREIGN_KEY_VIOLATION:
                    raise
        return len(objects)

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Game person'
        verbose_name_plural = 'Games person'
