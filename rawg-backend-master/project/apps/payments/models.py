import datetime
import logging
import secrets
import typing
from decimal import Decimal

from django.conf import settings
from django.contrib.postgres.fields import JSONField
from django.core.paginator import Paginator
from django.core.serializers.json import DjangoJSONEncoder
from django.core.validators import MinLengthValidator, MinValueValidator
from django.db import models, transaction
from django.db.models.functions import Coalesce
from django.utils.functional import cached_property

from apps.games.models import Game, Game, PlayerGameSession, PlayerGameSession
from apps.stat.models import Visit
from apps.users.models import Balance
from .tasks import send_payment_to_game
from .utils import Constants, PaymentException, PaymentStateMachineMixin

logger = logging.getLogger('payment')


class EventManager(models.Manager):
    def get_queryset(self):
        if self.model.EVENT_TYPE is not None:
            return super().get_queryset().filter(_event_type=self.model.EVENT_TYPE)
        return super().get_queryset()


class PaymentEvent(models.Model):
    EVENT_TYPE = None

    _event_type = models.CharField(max_length=32, editable=False, db_index=True)
    payment = models.ForeignKey('Payment', on_delete=models.PROTECT, editable=False, related_name='payment_events')
    created = models.DateTimeField(auto_now_add=True)
    data = JSONField(encoder=DjangoJSONEncoder, editable=False)  # index on {'id': ...}

    objects = EventManager()

    class Meta:
        verbose_name = 'событие процесса оплаты'
        verbose_name_plural = 'события процесса оплаты'

    def save(self, *args, **kwargs):
        new = self.id is None
        if not self._event_type:
            self._event_type = self.EVENT_TYPE
        ret = super().save(*args, **kwargs)
        if new:
            self.payment.trigger(f'change_to_{self.EVENT_TYPE}', event_instance=self)
            self.send_event_to_game()
        return ret

    def send_event_to_game(self):
        pass

    def action_before_change(self, event):
        pass

    def action_after_change(self, event):
        event.model.last_success_event = self
        event.model.save()

    def on_exception(self, event):
        error = PaymentException(dest=self.EVENT_TYPE, message=str(event.error), data=self.data)
        instance_event = ErrorEvent(payment=self.payment, data=error.to_dict())
        instance_event.save()

    def __str__(self):
        return f'{self._event_type} - id: {self.id}'


class CreatedEvent(PaymentEvent):
    EVENT_TYPE = Constants.CREATED

    class Meta:
        proxy = True


class PendingEvent(PaymentEvent):
    EVENT_TYPE = Constants.PENDING

    class Meta:
        proxy = True


class CanceledEvent(PaymentEvent):
    EVENT_TYPE = Constants.CANCELED

    class Meta:
        proxy = True

    def on_exception(self, event):
        logger.warning(f'Failed to switch payment status after cancellation from payment system. Event id: {self.id}')


class PaidEvent(PaymentEvent):
    EVENT_TYPE = Constants.PAID

    class Meta:
        proxy = True

    def send_event_to_game(self):
        send_payment_to_game.delay(self.payment_id)

    def on_exception(self, event):
        logger.warning(
            f'Failed to switch payment state after receiving payment data from the payment system. Event id: {self.id}'
        )


class PaymentConfirmedEvent(PaymentEvent):
    EVENT_TYPE = Constants.PAYMENT_CONFIRMED

    class Meta:
        proxy = True

    def on_exception(self, event):
        logger.warning(f'Failed to switch payment state after trying to confirm payment by game. Event id: {self.id}')


class RefundedEvent(PaymentEvent):
    EVENT_TYPE = Constants.REFUNDED

    class Meta:
        proxy = True

    def send_event_to_game(self):
        send_payment_to_game.delay(self.payment_id)

    def on_exception(self, event):
        logger.warning(
            f'Failed to switch payment state after receiving refund data from the payment system. Event id: {self.id}'
        )


class RefundConfirmedEvent(PaymentEvent):
    EVENT_TYPE = Constants.REFUND_CONFIRMED

    class Meta:
        proxy = True

    def on_exception(self, event):
        logger.warning(f'Failed to switch payment state after trying to confirm refund by game. Event id: {self.id}')


class ErrorEvent(PaymentEvent):
    EVENT_TYPE = Constants.ERROR

    class Meta:
        proxy = True

    def action_after_change(self, event):
        event.model.save()


def generate_token() -> str:
    return secrets.token_urlsafe(32)


class PaymentQuerySet(models.QuerySet):
    def client_data_annotated(self):
        sub = CreatedEvent.objects.filter(payment_id=models.OuterRef('id'))
        return self.annotate(data=models.Subquery(sub.values('data')))

    def annotate_discount(self):
        sub = PendingEvent.objects.filter(payment_id=models.OuterRef('id')).values('data__discount').distinct()
        return self.annotate(
            discount=Coalesce(
                models.Subquery(sub, output_field=models.FloatField()),
                models.Value('0.0')
            )
        )

    def exclude_initial(self):
        return self.client_data_annotated() \
            .exclude(models.Q(current_state=Constants.INITIAL) | models.Q(data__isnull=True))

    def join_and_lock_balance(self):
        return self.select_related('player__balance').select_for_update().exclude(player__balance__isnull=True)


class Payment(PaymentStateMachineMixin, models.Model):
    XSOLLA = 'xsolla'
    UKASSA = 'ukassa'
    PAYMENT_SYSTEMS = (
        (XSOLLA, 'Xsolla'),
        (UKASSA, 'Ukassa'),
    )

    def __init__(self, *args, **kwargs):
        PaymentStateMachineMixin.__init__(self, *args, **kwargs)
        models.Model.__init__(self, *args, **kwargs)

    current_state = models.CharField(verbose_name='state', choices=Constants.STATES_CHOICES, max_length=32)
    last_success_event = models.ForeignKey(
        PaymentEvent, on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )
    payment_system_name = models.CharField(choices=PAYMENT_SYSTEMS, max_length=20, blank=True)
    game = models.ForeignKey(
        Game, blank=True, null=True, on_delete=models.SET_NULL, related_name='payments', editable=False
    )
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.SET_NULL, to_field='player_id', editable=False
    )
    game_session = models.ForeignKey(
        PlayerGameSession, blank=True, null=True, on_delete=models.SET_NULL, to_field='game_sid', editable=False
    )
    created = models.DateTimeField(auto_now_add=True)
    token = models.CharField(
        'token', default=generate_token, unique=True, max_length=50, editable=False, validators=[MinLengthValidator(40)]
    )

    objects = models.Manager.from_queryset(PaymentQuerySet)()

    class Meta:
        verbose_name = 'состояние процесса оплаты'
        verbose_name_plural = 'состояния процессов оплаты'
        ordering = ('id',)

    @property
    def state(self):
        return self.current_state or self.initial

    @state.setter
    def state(self, value):
        self.current_state = value

    @property
    def can_pay(self) -> bool:
        return getattr(self, f'may_change_to_{Constants.PENDING}', lambda: False)()


class PaymentProject(models.Model):
    payment_system_name = models.CharField(choices=Payment.PAYMENT_SYSTEMS, max_length=20, blank=False)
    id = models.PositiveIntegerField('id проекта', primary_key=True)
    game = models.ForeignKey(Game, verbose_name='игра', on_delete=models.CASCADE)
    secret_key = models.CharField('секретный ключ', max_length=255, blank=False)

    class Meta:
        verbose_name = 'Проект игры в платёжной системе'
        verbose_name_plural = 'Проекты игры в платёжной системе'
        constraints = [
            models.UniqueConstraint(fields=['payment_system_name', 'game'], name='paymentproject_game_unique')
        ]


class XsollaProject(models.Model):
    id = models.PositiveIntegerField('id проекта', primary_key=True)
    game = models.OneToOneField(Game, verbose_name='игра', on_delete=models.CASCADE)
    secret_key = models.CharField('секретный ключ', max_length=100)

    class Meta:
        verbose_name = 'проект Xsolla'
        verbose_name_plural = 'проекты Xsolla'


class XsollaNotification(models.Model):
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.SET_NULL, to_field='player_id'
    )
    game_session = models.ForeignKey(
        PlayerGameSession, blank=True, null=True, on_delete=models.SET_NULL, to_field='game_sid'
    )
    project = models.ForeignKey(XsollaProject, blank=True, null=True, on_delete=models.SET_NULL)
    notification_type = models.CharField(max_length=100, db_index=True)
    data = JSONField(blank=True)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True


class XsollaTransaction(XsollaNotification):
    transaction_id = models.PositiveIntegerField(unique=True)

    class Meta:
        verbose_name = 'транзакция Xsolla'
        verbose_name_plural = 'транзакции Xsolla'


class LLPConfig(models.Model):
    active = models.BooleanField(default=False)
    full_duration = models.PositiveSmallIntegerField()
    stage_duration = models.PositiveSmallIntegerField()
    lives = models.PositiveSmallIntegerField()
    hot_streak_factor = models.DecimalField(max_digits=10, decimal_places=2)
    serial_hot_streak = models.PositiveSmallIntegerField()
    weekly_logins_hot_streak = models.PositiveSmallIntegerField()
    bonus_per_day = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'LoginsLoyaltyProgram config'
        verbose_name_plural = 'LoginsLoyaltyProgram configs'
        constraints = [
            models.UniqueConstraint(
                condition=models.Q(active=True), fields=['active'], name='active_constraint'
            ),
        ]

    def save(self, *args, **kwargs):
        if self.active:
            self.__class__.objects.update(active=False)
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.active:
            raise AssertionError('Cant delete active config')
        return super().delete(*args, **kwargs)


def default_config():
    config, created = LLPConfig.objects.get_or_create(
        active=True,
        defaults=dict(full_duration=14, stage_duration=7, lives=2, hot_streak_factor=0.15, serial_hot_streak=2,
                      weekly_logins_hot_streak=3, bonus_per_day=10)
    )
    if created:
        logger.error(f'config for the loyalty program not found, a default config created, id: {config.id}.')
    return config.id


class LoginsLoyaltyProgramQueryset(models.QuerySet):
    def not_accepted(self):
        return self.filter(accepted=False)

    def accepted(self):
        return self.filter(accepted=True)


class LoginsLoyaltyProgram(models.Model):
    class CannotAccept(Exception):
        pass

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='logins_loyalty_programs', editable=False
    )
    config = models.ForeignKey(LLPConfig, on_delete=models.SET_DEFAULT, default=default_config)
    start_date = models.DateField('start date', auto_now_add=True, editable=False)
    accepted = models.BooleanField('credited to account', default=False, editable=False)
    accepted_date = models.DateField('date of crediting to account', null=True, editable=False)
    accepted_bonuses = models.DecimalField(
        'accepted bonuses',
        max_digits=10,
        decimal_places=2,
        default=0,
        editable=False,
        validators=[MinValueValidator(0)]
    )

    objects = models.Manager.from_queryset(LoginsLoyaltyProgramQueryset)()

    class Meta:
        verbose_name = 'Login loyalty program'
        verbose_name_plural = 'Login loyalty programs'
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                name='unique_user_accepted_logins_loyalty_program',
                condition=models.Q(accepted=False)
            ),
            models.CheckConstraint(
                check=models.Q(accepted_bonuses__gte=0),
                name='accepted_bonuses_gte_0'
            )
        ]

    @classmethod
    @transaction.atomic
    def accept(cls, user_id: int) -> 'LoginsLoyaltyProgram':
        """Credit bonuses to balance"""
        instance = cls.objects.not_accepted().select_related('user__balance').select_for_update(of=['self']) \
            .get(user_id=user_id)

        if not instance.can_accept:
            raise cls.CannotAccept()

        instance.accepted = True
        instance.accepted_date = datetime.date.today()
        instance.accepted_bonuses = instance.full_bonus
        instance.save(update_fields=['accepted', 'accepted_date', 'accepted_bonuses'])
        instance.user.balance.top_up_bonuses(instance.accepted_bonuses)
        return instance

    @property
    def lives(self) -> int:
        """Available number of lives"""
        return max(self.config.lives - len(self.saved_days), 0)

    @property
    def current_program_day(self) -> int:
        """Starts from 0, may be more program duration"""
        return (datetime.date.today() - self.start_date).days

    @property
    def completed_days(self) -> int:
        """Starts from 1, can't be more than program duration"""
        return min(self.current_program_day + 1, self.config.full_duration)

    @property
    def can_accept(self) -> bool:
        return not self.accepted and self.current_program_day + 1 >= self.config.full_duration

    @property
    def base_bonus(self) -> Decimal:
        return len(self.logins_with_saved) * self.config.bonus_per_day

    @property
    def full_bonus(self) -> Decimal:
        return self.bonus_serial + self.bonus_amount_logins + self.base_bonus

    @property
    def hot_streak_bonus(self) -> Decimal:
        """Bonuses for all types of hot streaks"""
        return self.bonus_serial + self.bonus_amount_logins

    @property
    def bonus_serial(self) -> Decimal:
        """Bonuses for the hot streak - continuous series of visits"""
        return len(self.days_serial_hot_streak) * self.config.hot_streak_factor * self.config.bonus_per_day

    @property
    def bonus_amount_logins(self) -> Decimal:
        """Bonuses for the hot streak - number of visits per weeks"""
        return len(self.days_amount_logins_hot_streak) * self.config.hot_streak_factor * self.config.bonus_per_day

    @property
    def hot_streak_days(self) -> typing.List[int]:
        """Number of all hot streak days"""
        return self.days_serial_hot_streak + self.days_amount_logins_hot_streak

    @property
    def days_serial_hot_streak(self) -> typing.List[int]:
        """Number of days with a hot streak - continuous series of visits"""
        result, serial = [], []
        for index, is_visited in enumerate(self.logins_as_bits_array[:self.config.stage_duration]):
            if is_visited:
                serial.append(index)
            elif len(serial) >= self.config.serial_hot_streak:
                result.extend(serial)
                serial = []
            else:
                serial = []
        if len(serial) >= self.config.serial_hot_streak:
            result.extend(serial)
        return result

    @property
    def days_amount_logins_hot_streak(self) -> typing.List[int]:
        """Number of days with a hot streak - number of visits per weeks"""
        result = []
        paginator = Paginator(self.logins_as_bits_array[self.config.stage_duration:], self.config.stage_duration)
        for week_number in paginator.page_range:
            week = paginator.get_page(week_number)
            if sum(week) >= self.config.weekly_logins_hot_streak:
                start = week_number * self.config.stage_duration
                result.extend([index for index, day in enumerate(week, start=start) if day])
        return result

    @property
    def last_day_date(self):
        return self.start_date + datetime.timedelta(days=self.config.full_duration - 1)

    @cached_property
    def logins_as_bits_array(self) -> typing.List[bool]:
        logins_as_bits = [False] * self.config.full_duration
        for login_date in self.logins_with_saved:
            logins_as_bits[(login_date - self.start_date).days] = True
        return logins_as_bits

    @cached_property
    def saved_days(self) -> typing.List[datetime.date]:
        lives = self.config.lives
        result = []
        logins = set(self.logins)
        for day_index in range(self.completed_days):
            if lives == 0:
                break
            day_date = self.start_date + datetime.timedelta(days=day_index)
            if day_date not in logins:
                result.append(day_date)
                lives -= 1
        return result

    @cached_property
    def logins(self) -> typing.List[datetime.date]:
        after_end = self.start_date + datetime.timedelta(days=self.config.full_duration)
        visits = Visit.objects.filter(
            user_id=self.user_id,
            datetime__date__gte=self.start_date,
            datetime__date__lt=after_end
        )
        return list(visits.dates('datetime', 'day'))

    @cached_property
    def logins_with_saved(self) -> typing.List[datetime.date]:
        return sorted(self.logins + self.saved_days)
