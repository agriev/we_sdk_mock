from datetime import timedelta
from decimal import Decimal

import dateutil
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import connection, models, transaction
from django.db.models import Q, Sum
from django.utils.functional import cached_property
from django.utils.timezone import now

from apps.achievements.models import ParentAchievement
from apps.games.models import Game
from apps.utils.models import InitialValueMixin
from apps.utils.unchangeable import UnchangeableQuerySet


class CycleManager(models.Manager):
    def cycle(self, *only, check_status=None):
        kwargs = {'start__lt': now()}
        if check_status:
            key = 'status{}'.format('__in' if type(check_status) is not str else '')
            kwargs[key] = check_status
        qs = self.get_queryset().filter(**kwargs).order_by('-start')
        if only:
            qs = qs.only(*only)
        return qs.first()

    def current(self, *only):
        return self.cycle(*only, check_status=False)

    def active(self, *only):
        return self.cycle(*only, check_status=self.model.STATUS_ACTIVE)

    def finishing(self, *only):
        return self.cycle(*only, check_status=self.model.STATUS_FINISHING)

    def active_or_finishing(self, *only):
        return self.cycle(*only, check_status=[self.model.STATUS_ACTIVE, self.model.STATUS_FINISHING])

    def next(self, *only):
        active = self.current('start')
        if not active:
            return None
        qs = self.get_queryset().filter(start__gt=active.start).order_by('start')
        if only:
            qs = qs.only(*only)
        return qs.first()


class Cycle(InitialValueMixin, models.Model):
    STATUS_NEW = 'new'
    STATUS_ACTIVE = 'active'
    STATUS_FINISHING = 'finishing'
    STATUS_SUCCESS = 'success'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILURE = 'failure'
    STATUSES = (
        (STATUS_NEW, 'New'),
        (STATUS_ACTIVE, 'Active'),
        (STATUS_FINISHING, 'Finishing'),
        (STATUS_SUCCESS, 'Success'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_FAILURE, 'Failure'),
    )

    start = models.DateTimeField()
    end = models.DateTimeField()
    finished = models.DateTimeField(blank=True, default=None, editable=False, null=True)
    achievements = models.PositiveIntegerField(default=0, editable=False)
    percent = models.PositiveIntegerField(default=0, editable=False)
    status = models.CharField(choices=STATUSES, default=STATUS_NEW, max_length=10, db_index=True, editable=False)
    data = ArrayField(models.IntegerField(), default=list, editable=False)

    init_fields = ('status',)
    objects = CycleManager()

    class Meta:
        verbose_name = 'Cycle'
        verbose_name_plural = 'Cycles'

    def __str__(self):
        return '{} - {}'.format(self.start, self.end)

    @property
    def exchange_until(self):
        next_cycle = Cycle.objects.next('start')
        if next_cycle:
            return next_cycle.start
        return self.finished or self.end + timedelta(days=5)

    @property
    def achieved_tokens_count(self):
        for stage in reversed(self.get_stages()):
            if stage['achieved']:
                return stage['tokens']
        return 0

    def date_in_cycle(self, date):
        if not date:
            return False
        if type(date) is str:
            date = dateutil.parser.parse(date)
        return self.start <= date < self.end

    def get_stages(self):
        stages = sorted(self.stages.values('achievements', 'tokens'), key=lambda x: x['achievements'])
        for stage in stages:
            stage['achieved'] = self.achievements >= stage['achievements']
        return stages

    def update_active(self, set_failure=False, set_finishing=False):
        fields = {}
        stages = self.get_stages()
        if self.end < now() and (set_finishing or set_failure):
            fields['status'] = self.STATUS_FAILURE if set_failure else self.STATUS_FINISHING
            if set_failure:
                for stage in stages:
                    if self.achievements >= stage['achievements']:
                        fields['status'] = self.STATUS_SUCCESS
                        fields['finished'] = now()
                        break
        else:
            fields['achievements'] = CycleUser.objects.filter(cycle=self).aggregate(s=Sum('achievements'))['s'] or 0
            if stages:
                need_achievements = stages[-1]['achievements']
                percent = fields['achievements'] / (need_achievements / 100)
                if percent and percent < 1:
                    percent = 1
                fields['percent'] = percent
                if fields['achievements'] >= need_achievements:
                    fields['status'] = self.STATUS_COMPLETED
                    fields['finished'] = now()
        update = []
        for field, value in fields.items():
            if value != getattr(self, field):
                setattr(self, field, value)
                update.append(field)
        if update:
            from apps.token.tasks import notification, update_progress_finishing
            with transaction.atomic():
                self.save(update_fields=update)
                if fields.get('status') == self.STATUS_FINISHING:
                    # fast achievements fetching
                    transaction.on_commit(lambda: update_progress_finishing.delay())
                else:
                    transaction.on_commit(lambda: notification.delay(self.id))

    def update_next(self):
        if self.start < now() and self.status == self.STATUS_NEW:
            from apps.token.tasks import notification
            self.status = self.STATUS_ACTIVE
            with transaction.atomic():
                self.save(update_fields=['status'])
                transaction.on_commit(lambda: notification.delay(self.id))


class CycleStage(models.Model):
    cycle = models.ForeignKey(Cycle, models.CASCADE, related_name='stages')
    achievements = models.PositiveIntegerField()
    tokens = models.PositiveIntegerField()

    class Meta:
        verbose_name = 'Cycle Stage'
        verbose_name_plural = 'Cycle Stages'

    def __str__(self):
        return '{} - {} - {}'.format(self.cycle_id, self.achievements, self.tokens)


class CycleUserManager(models.Manager):
    def position(self, cycle_id):
        fields = []
        for field in CycleUser._meta.ordering:
            name = field
            ordering = 'ASC'
            if field[0] == '-':
                name = field[1:]
                ordering = 'DESC'
            fields.append('{} {}'.format(name, ordering))
        return CycleUser.objects.filter(cycle_id=cycle_id).extra(
            select={'position': 'ROW_NUMBER() OVER (ORDER BY {})'.format(', '.join(fields))}
        )


class CycleUser(models.Model):
    GROUPS = [20, 50, 100]
    PERCENTS = [65, 20, 15]

    cycle = models.ForeignKey(Cycle, models.CASCADE, related_name='user_cycles', editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='user_cycles', editable=False)
    karma = models.PositiveIntegerField(default=0, editable=False, db_index=True)
    achievements = models.PositiveIntegerField(default=0, editable=False)
    achievements_gold = models.PositiveIntegerField(default=0, editable=False)
    achievements_silver = models.PositiveIntegerField(default=0, editable=False)
    achievements_bronze = models.PositiveIntegerField(default=0, editable=False)
    position_yesterday = models.PositiveIntegerField(default=0, editable=False)
    karma_is_exchanged = models.BooleanField(default=False)

    objects = CycleUserManager()

    class Meta:
        verbose_name = 'Cycle User'
        verbose_name_plural = 'Cycle Users'
        unique_together = ('cycle', 'user')
        ordering = (
            '-karma', 'user_id',
        )

    def __str__(self):
        return '{} - {}'.format(self.cycle_id, self.user_id)

    @cached_property
    def position(self):
        if not self.id:
            return CycleUser.objects.filter(cycle_id=self.cycle_id).count() + 1
        with connection.cursor() as cursor:
            cursor.execute(
                'WITH subquery AS ({}) SELECT position FROM subquery '
                'WHERE user_id = %s'.format(CycleUser.objects.position(self.cycle_id).query),
                [self.user_id]
            )
            return cursor.fetchone()[0]

    @cached_property
    def percent(self):
        if self.position > self.users_total:
            return 100
        return self.position / (self.users_total / 100)

    @cached_property
    def top(self):
        if self.percent < self.GROUPS[0]:
            return self.GROUPS[0]
        if self.percent < self.GROUPS[1]:
            return self.GROUPS[1]
        return self.GROUPS[2]

    @cached_property
    def users_total(self):
        return CycleUser.objects.filter(cycle_id=self.cycle_id, karma__gt=0).count()

    @cached_property
    def users_count_edges(self):
        count_1 = int(self.users_total / 100 * self.GROUPS[0])
        if self.percent < self.GROUPS[0]:
            return 0, count_1
        count_2 = int(self.users_total / 100 * self.GROUPS[1])
        if self.percent < self.GROUPS[1]:
            return count_2 - count_1, count_2
        return count_2, None

    @cached_property
    def users_group_karma(self):
        edge_0, edge_1 = self.users_count_edges
        ids = CycleUser.objects.filter(cycle_id=self.cycle_id, karma__gt=0).values_list('id', flat=True)
        return CycleUser.objects.filter(id__in=ids[edge_0:edge_1]).aggregate(sum=Sum('karma'))['sum'] or 0

    def get_tokens_group(self, all_tokens):
        percent = self.PERCENTS[2]
        if self.percent < self.GROUPS[0]:
            percent = self.PERCENTS[0]
        elif self.percent < self.GROUPS[1]:
            percent = self.PERCENTS[1]
        return Decimal(percent) * (Decimal(all_tokens) / Decimal(100))

    def get_token_max_count(self, all_tokens):
        return Decimal(all_tokens) / Decimal(100) * Decimal(5)

    def get_tokens_count(self, all_tokens):
        if not self.users_group_karma:
            return 0
        user_percent = Decimal(self.karma) / (Decimal(self.users_group_karma) / Decimal(100))
        tokens_count = user_percent * (self.get_tokens_group(all_tokens) / Decimal(100))
        return min(tokens_count, self.get_token_max_count(all_tokens))

    def exchange_karma(self):
        error = (
            self.karma_is_exchanged
            or self.cycle.status not in (Cycle.STATUS_COMPLETED, Cycle.STATUS_SUCCESS)
            or not self.user.token_program
        )
        if error:
            return False
        tokens_count = self.get_tokens_count(self.cycle.achieved_tokens_count)
        with transaction.atomic():
            self.karma_is_exchanged = True
            self.save(update_fields=['karma_is_exchanged'])
            Transaction.objects.create(
                user=self.user, count=tokens_count,
                operation=Transaction.OPERATION_IN, type=Transaction.TYPE_KARMA
            )
            return tokens_count


class CycleKarma(InitialValueMixin, models.Model):
    THRESHOLDS = [5, 20]

    cycle = models.ForeignKey(Cycle, models.CASCADE, related_name='cycle_karma', editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='cycle_karma', editable=False)
    parent_achievement = models.ForeignKey(
        ParentAchievement, models.CASCADE, related_name='cycle_karma', editable=False
    )
    karma = models.PositiveIntegerField(default=0, editable=False)
    is_new = models.BooleanField(default=True, editable=False)
    achieved = models.DateTimeField(editable=False)

    init_fields = ('karma',)

    class Meta:
        verbose_name = 'Cycle Karma'
        verbose_name_plural = 'Cycle Karma'
        unique_together = ('cycle', 'user', 'parent_achievement')

    def __str__(self):
        return '{} - {} - {}'.format(self.cycle_id, self.user_id, self.karma)

    @classmethod
    def get_type(cls, percent):
        percent = float(percent)
        if percent and percent < cls.THRESHOLDS[0]:
            return 'gold'
        elif percent and percent < cls.THRESHOLDS[1]:
            return 'silver'
        return 'bronze'

    @classmethod
    def get_karma(cls, percent, statuses):
        percent = float(percent)
        if GameStatus.STATUS_EXCLUDE in statuses:
            return 0
        karma = 1
        if percent and percent < cls.THRESHOLDS[0]:
            karma = 3
        elif percent and percent < cls.THRESHOLDS[1]:
            karma = 2
        if GameStatus.STATUS_PARTNER_ALWAYS in statuses or GameStatus.STATUS_PARTNER_FOR_CYCLE in statuses:
            karma += 1
        return karma

    @staticmethod
    def get_statuses(game_id, cycle_id):
        statuses = set()
        rows = GameStatus.objects \
            .filter(Q(cycle_id=cycle_id) | Q(cycle_id=None), game_id=game_id) \
            .values('status', 'cycle_id') \
            .order_by('-cycle_id')
        for row in rows:
            if row['status'] == GameStatus.STATUS_PARTNER_FOR_CYCLE and not row['cycle_id']:
                continue
            statuses.add(row['status'])
        return statuses


class GameStatus(InitialValueMixin, models.Model):
    STATUS_PARTNER_FOR_CYCLE = 'partner_cycle'
    STATUS_PARTNER_ALWAYS = 'partner_always'
    STATUS_EXCLUDE = 'exclude'
    STATUSES = (
        (STATUS_PARTNER_FOR_CYCLE, 'Partnership for a cycle'),
        (STATUS_PARTNER_ALWAYS, 'Partnership always'),
        (STATUS_EXCLUDE, 'Exclude'),
    )

    game = models.ForeignKey(Game, models.CASCADE, related_name='token_statuses')
    cycle = models.ForeignKey(Cycle, models.CASCADE, blank=True, default=None, null=True, related_name='game_statuses')
    status = models.CharField(choices=STATUSES, default=STATUS_PARTNER_FOR_CYCLE, max_length=15)

    init_fields = ('game_id', 'cycle_id', 'status')
    unchangeable_fields = ('game_id', 'cycle_id', 'status')
    objects = UnchangeableQuerySet.as_manager()

    class Meta:
        verbose_name = 'Game Status'
        verbose_name_plural = 'Game Statuses'

    def __str__(self):
        return '{} - {}'.format(self.game_id, self.get_status_display())


class Transaction(models.Model):
    OPERATION_IN = 'in'
    OPERATION_OUT = 'out'
    OPERATIONS = (
        (OPERATION_IN, 'In'),
        (OPERATION_OUT, 'Out'),
    )
    TYPE_MONEY = 'money'
    TYPE_KARMA = 'karma'
    TYPE_PRODUCT = 'shop'
    TYPES = (
        (TYPE_MONEY, 'Input from/output to outside'),
        (TYPE_KARMA, 'Getting from karma'),
        (TYPE_PRODUCT, 'Buying in shop'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='transactions', editable=False)
    created = models.DateTimeField(auto_now_add=True)
    count = models.DecimalField(max_digits=19, decimal_places=10, default=0, editable=False)
    operation = models.CharField(choices=OPERATIONS, max_length=3, editable=False)
    type = models.CharField(choices=TYPES, max_length=5, editable=False)

    class Meta:
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'

    def __str__(self):
        return '{} - {} - {}'.format(self.user, self.type, self.count)

    @classmethod
    def shop_with_tokens(cls, user, count):
        """
        Checks if user has sufficient tokens and creates Transaction.
        :param user: User, who buys
        :param count: Tokens to spend
        :return: None or Transaction object
        """

        if user.tokens < count:
            return None

        return cls.objects.create(user=user, count=count, operation=cls.OPERATION_OUT, type=cls.TYPE_PRODUCT)


class Subscription(models.Model):
    cycle = models.ForeignKey(Cycle, models.CASCADE, related_name='subscriptions', editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, models.CASCADE, related_name='token_subscriptions', editable=False
    )
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Subscription'
        verbose_name_plural = 'Subscriptions'
        unique_together = ('cycle', 'user')

    def __str__(self):
        return '{} - {}'.format(self.user_id, self.cycle_id)
