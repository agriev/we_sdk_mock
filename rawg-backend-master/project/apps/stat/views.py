import calendar
from abc import abstractmethod
from collections import OrderedDict
from datetime import datetime, timedelta, timezone

import pytz
from dateutil.relativedelta import MO, relativedelta
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db.models import Count, Q, Sum
from django.db.models.functions import Extract, ExtractMonth, ExtractWeek, TruncDay, TruncMonth
from django.utils.timezone import now
from django.views.generic import TemplateView
from reversion.models import Revision

from apps.comments.models import CommentCollectionFeed, CommentDiscussion, CommentReview
from apps.common.cache import CommonContentType
from apps.games.models import Collection, Game
from apps.reviews.models import Review
from apps.stat.models import (
    APIByIPAndUserAgentVisit, APIByIPVisit, APIByUserAgentVisit, APIByUserVisit, RecommendationsVisit,
    RecommendedGameAdding, RecommendedGameStoreVisit, RecommendedGameVisit, Status, Visit,
)
from apps.users.models import User, UserFollowElement, UserGame
from apps.utils.api import int_or_none, int_or_number
from apps.utils.dates import diff_month, diff_week, first_day_of_month, monday
from apps.utils.views import StaffRequiredMixin


class DatesRangeMixin(object):
    date_format_string = '%d/%m/%Y'
    start_date = None
    end_date = None
    min_date = None
    max_date = None
    period = 'day'

    def get_default_min_date(self):
        min_date = now() - relativedelta(months=1)
        if min_date < self.min_date:
            return self.min_date.replace(hour=0, minute=0, second=0, microsecond=0)
        return min_date

    def get_default_max_date(self):
        return self.max_date

    def set_dates(self):
        self.max_date = now()
        try:
            self.start_date = pytz.utc.localize(datetime.strptime(self.request.GET.get('start', ''),
                                                                  self.date_format_string))
        except ValueError:
            self.start_date = self.get_default_min_date()
        try:
            self.end_date = pytz.utc.localize(datetime.strptime(self.request.GET.get('end', ''),
                                                                self.date_format_string))
        except ValueError:
            self.end_date = self.get_default_max_date()

    def date_format(self, day):
        if self.period == 'week':
            try:
                return int('{:%V}'.format(day))
            except ValueError:
                return int(day)
        if self.period == 'month':
            return '{:%m/%Y}'.format(day)
        return '{:%d/%m/%Y}'.format(day)


class CountMixin(DatesRangeMixin):
    title = ''
    field_name = ''
    points = {}
    middle_points = {}
    users_points = {}
    template_name = 'stat/count.html'
    is_users = False
    is_middle = False
    language = None

    @abstractmethod
    def set_min_date(self):
        pass

    def set_extract(self):
        self.extract = TruncDay(self.field_name)
        if self.period == 'month':
            self.extract = TruncMonth(self.field_name)
        elif self.period == 'week':
            self.extract = ExtractWeek(self.field_name)

    def set_empty_points(self):
        self.period = self.request.GET.get('period') or 'day'
        self.set_extract()
        self.start_date = self.start_date.replace(microsecond=0, second=0, minute=0, hour=0)
        self.end_date = self.end_date.replace(microsecond=0, second=0, minute=0, hour=0)
        delta = timedelta(days=1)
        start_iter_date = self.start_date
        if self.period == 'month':
            delta = relativedelta(months=1)
            start_iter_date = self.start_date.replace(day=1)
        elif self.period == 'week':
            delta = relativedelta(weeks=1)
            start_iter_date = self.start_date + relativedelta(weekday=MO(-1))
        self.points = OrderedDict()
        while start_iter_date <= self.end_date:
            self.points[self.date_format(start_iter_date)] = 0
            start_iter_date += delta

    @abstractmethod
    def set_points(self):
        pass

    def set_middle_points(self):
        self.field_name = 'date_joined'
        self.set_extract()
        registrations = list(get_user_model().objects
                             .filter(date_joined__lte=self.end_date)
                             .annotate(period=self.extract)
                             .values('period')
                             .annotate(count=Count('id'))
                             .values_list('period', 'count')
                             .order_by('period'))
        # convert to total
        total = 0
        users_points = OrderedDict()
        for day, count in registrations:
            total += count
            users_points[self.date_format(day)] = total
        # users points
        self.users_points = OrderedDict()
        last_users_count = total
        for day, count in self.points.items():
            last_users_count = users_points.get(day) or last_users_count
            self.users_points[day] = last_users_count
        # middle points
        if self.is_middle:
            self.middle_points = OrderedDict()
            for day, count in self.points.items():
                self.middle_points[day] = round(count / self.users_points.get(day), 2)
        if not self.is_users:
            self.users_points = {}

    def get_qs(self, model=None, qs=None):
        if qs is None and model:
            qs = model.objects
        return list(
            qs
            .filter(**{
                '{}__date__gte'.format(self.field_name): self.start_date,
                '{}__date__lte'.format(self.field_name): self.end_date
            })
            .annotate(period=self.extract)
            .values('period')
            .annotate(count=Count('id'))
            .values_list('period', 'count')
            .order_by('period')
        )

    def get_context(self, context, title):
        context.update({
            'title': title,
            'start_date': self.start_date,
            'end_date': self.end_date,
            'min_date': self.min_date,
            'max_date': self.max_date,
            'points': self.points.items(),
            'middle_points': list(self.middle_points.values()),
            'users_points': list(self.users_points.values()),
            'period': self.period,
            'is_users': self.is_users,
            'is_middle': self.is_middle,
        })
        return context

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        self.is_users = self.request.GET.get('users')
        self.is_middle = self.request.GET.get('middle')
        self.set_min_date()
        self.set_dates()
        self.set_empty_points()
        self.set_points()
        if self.is_users or self.is_middle:
            self.set_middle_points()
        return self.get_context(context, self.title)


class UsersRegistrationsView(StaffRequiredMixin, CountMixin, TemplateView):
    title = 'Registrations'
    field_name = 'date_joined'
    template_name = 'stat/users_registrations.html'

    def set_min_date(self):
        try:
            self.min_date = get_user_model().objects.values_list('date_joined', flat=True).earliest('date_joined')
        except get_user_model().DoesNotExist:
            self.min_date = now()

    def set_points(self):
        if not self.language:
            dates_counts = self.get_qs(get_user_model())
        else:
            dates_counts = self.get_qs(qs=get_user_model().objects.filter(source_language=self.language))
        for day, count in dates_counts:
            self.points[self.date_format(day)] = count

    def get_context_data(self, **kwargs):
        self.language = self.request.GET.get('language')
        context = super().get_context_data(**kwargs)
        context['language'] = self.language
        return context


class UsersVisitsView(StaffRequiredMixin, DatesRangeMixin, TemplateView):
    template_name = 'stat/users_visits.html'

    def get_every_day(self):
        dates_counts = list(Visit.objects
                            .filter(datetime__date__gte=self.start_date, datetime__date__lte=self.end_date)
                            .annotate(period=TruncDay('datetime'))
                            .values('user_id', 'period')
                            .annotate(count=Count('id'))
                            .values_list('user_id', 'period', 'count')
                            .order_by('user_id', 'period'))
        days_in_period = (self.end_date - self.start_date).days + 1
        every_day = 0
        users = {}
        for user_id, day, count in dates_counts:
            users[user_id] = users.get(user_id, 0)
            users[user_id] += 1
        for user_id, count in users.items():
            if count == days_in_period:
                every_day += 1
        return len(users), every_day

    def get_every_week(self):
        dates_counts = list(Visit.objects
                            .filter(datetime__date__gte=self.start_date, datetime__date__lte=self.end_date)
                            .annotate(period=ExtractWeek('datetime'))
                            .values('user_id', 'period')
                            .annotate(count=Count('id'))
                            .values_list('user_id', 'period', 'count')
                            .order_by('user_id', 'period'))
        weeks_in_period = diff_week(self.start_date, self.end_date) + 1
        every_week = 0
        users = {}
        for user_id, day, count in dates_counts:
            users[user_id] = users.get(user_id, 0)
            users[user_id] += 1
        for user_id, count in users.items():
            if count == weeks_in_period:
                every_week += 1
        return every_week

    def get_every_month(self):
        dates_counts = list(Visit.objects
                            .filter(datetime__date__gte=self.start_date, datetime__date__lte=self.end_date)
                            .annotate(period=TruncMonth('datetime'))
                            .values('user_id', 'period')
                            .annotate(count=Count('id'))
                            .values_list('user_id', 'period', 'count')
                            .order_by('user_id', 'period'))
        months_in_period = diff_month(self.start_date, self.end_date) + 1
        every_month = 0
        users = {}
        for user_id, day, count in dates_counts:
            users[user_id] = users.get(user_id, 0)
            users[user_id] += 1
        for user_id, count in users.items():
            if count == months_in_period:
                every_month += 1
        return every_month

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        try:
            self.min_date = Visit.objects.values_list('datetime', flat=True).earliest('datetime')
        except Visit.DoesNotExist:
            self.min_date = now()
        self.set_dates()

        total, day = self.get_every_day()
        points = [
            ('Total', total),
            ('Every month', self.get_every_month()),
            ('Every week', self.get_every_week()),
            ('Every day', day),
        ]

        context.update({
            'start_date': self.start_date,
            'end_date': self.end_date,
            'min_date': self.min_date,
            'max_date': self.max_date,
            'points': points,
        })
        return context


class UsersRetentionBaseView(StaffRequiredMixin, DatesRangeMixin, TemplateView):
    def get_last_day(self, date):
        last_day = calendar.monthrange(date.year, date.month)[1]
        return date.replace(day=last_day)

    def split_by(self, start, end):
        periods = []
        if self.period == 'week':
            mon = monday(start)
            while mon <= monday(end):
                sun = mon + timedelta(days=7)
                if sun > end:
                    break
                else:
                    periods.append((mon, sun))
                    mon = sun

        elif self.period == 'month':
            current = start
            while current <= end.replace(day=1):
                next_ = current.replace(day=15) + timedelta(days=21)
                if next_.replace(day=1) > end.replace(day=1):
                    break
                else:
                    periods.append((next_.replace(day=1), self.get_last_day(next_)))
                    current = next_

            periods.insert(
                0,
                (start.replace(day=1), self.get_last_day(start))
            )

        return periods

    def get_report_data(self, start, end=None):
        if self.period == 'week':
            end = monday(end) if end else monday(self.end_date)

            period_filter = ExtractWeek('datetime')
            visits_filters = (Q(datetime__date__gte=start) & Q(datetime__date__lt=end))
            user_reg_filters = (
                Q(user__date_joined__gte=start) & Q(user__date_joined__lt=(monday(start + timedelta(days=7)))))

        else:
            period_filter = ExtractMonth('datetime')
            visits_filters = (Q(datetime__date__gte=start) & Q(datetime__date__lt=self.get_last_day(self.end_date)))
            user_reg_filters = (
                Q(user__date_joined__gte=start) & Q(user__date_joined__lte=end))

        dates_qs = Visit.objects \
            .filter(visits_filters) \
            .annotate(period_arg=period_filter) \
            .annotate(year=Extract('datetime', lookup_name='isoyear')) \
            .values('year', 'period_arg') \
            .annotate(count=Count('user_id', distinct=True, filter=(visits_filters & user_reg_filters))) \
            .values_list('year', 'period_arg', 'count') \
            .order_by('year', 'period_arg')

        if self.period == 'week':
            users_count = User.objects. \
                filter(
                    date_joined__gte=start,
                    date_joined__lt=monday(start + timedelta(days=7))).count()
        else:
            users_count = User.objects. \
                filter(
                    date_joined__gte=start,
                    date_joined__lt=end).count()

        dates_count = []
        for (year, period_arg, count) in dates_qs.iterator():
            period_str = ''
            if self.period == 'week':
                to_period_start = datetime.strptime(f'{year} {period_arg}' + ' 0', "%Y %W %w")
                to_period_end = datetime.strptime(f'{year} {period_arg+1}' + ' 0', "%Y %W %w")
                period_str = f'{to_period_start.strftime("%b %d %Y")} — {to_period_end.strftime("%b %d %Y")}'
            else:
                to_period_start = datetime(year, period_arg, 1).date()
                if self.period == 'month' and period_arg + 1 > 12:
                    to_period_end = (datetime(year + 1, 1, 1) - timedelta(days=1)).date()
                else:
                    to_period_end = (datetime(year, period_arg + 1, 1) - timedelta(days=1)).date()
                period_str = f'{to_period_start.strftime("%b %d %Y")} — {to_period_end.strftime("%b %d %Y")}'
            percent = '{0:.2f}'.format(float((count / users_count) * 100) if users_count else float(0))
            dates_count.append(
                {
                    'year': year,
                    'period': period_arg,
                    'period_name': self.period,
                    'period_str': period_str,
                    'count': count,
                    'reg': users_count,
                    'percent': percent,
                }
            )

        return dates_count

    def get_total(self, period_points):
        total_points = {}
        for periods in period_points:
            for i, period in enumerate(periods):
                if not total_points.get(i):
                    total_points[i] = {'visits': period['count'], 'reg': period['reg']}
                total_points[i]['visits'] += period['count']
                total_points[i]['reg'] += period['reg']

        for _, points in total_points.items():
            percent = float((points['visits'] / points['reg']) * 100) if points['reg'] else float(0)
            points.update({'percent': percent})

        return ['{0:.2f}'.format(v['percent']) for k, v in total_points.items()]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        try:
            self.min_date = Visit.objects.values_list('datetime', flat=True).earliest('datetime')
        except Visit.DoesNotExist:
            self.min_date = now()
        self.set_dates()

        periods = self.split_by(self.start_date, self.end_date)

        period_points = []
        for (period_start, period_end) in periods:
            if self.period == 'week':
                period_end = None
            period_points.append(self.get_report_data(start=period_start, end=period_end))

        total_points = self.get_total(period_points)

        context.update({
            'start_date': self.start_date,
            'end_date': self.end_date,
            'min_date': self.min_date,
            'max_date': self.max_date,
            'points': period_points,
            'total': total_points,
        })
        return context


class UsersRetentionWeekView(UsersRetentionBaseView):
    template_name = 'stat/users_retention.html'
    period = 'week'


class UsersRetentionMonthView(UsersRetentionBaseView):
    template_name = 'stat/users_retention.html'
    period = 'month'


class UsersRetentionD1D7D30View(StaffRequiredMixin, DatesRangeMixin, TemplateView):
    template_name = 'stat/users_retention_d1d7d30.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        try:
            self.min_date = Visit.objects.values_list('datetime', flat=True).earliest('datetime')
        except Visit.DoesNotExist:
            self.min_date = now()
        self.set_dates()
        if not self.request.GET.get('start'):
            self.start_date = first_day_of_month(now()) - relativedelta(months=2)
            self.end_date = first_day_of_month(now()) - relativedelta(months=1) - timedelta(days=1)

        day0 = (
            get_user_model().objects
            .filter(date_joined__date__gte=self.start_date, date_joined__date__lte=self.end_date)
            .values_list('id', 'date_joined__date')
            .order_by('date_joined')
        )
        days = set(
            Visit.objects
            .filter(
                user__date_joined__gte=self.start_date,
                user__date_joined__lte=self.end_date,
                datetime__date__gte=self.start_date + timedelta(days=1),
                datetime__date__lte=self.end_date + timedelta(days=30)
            )
            .values_list('user_id', 'datetime__date')
            .order_by('datetime')
        )
        regs_total = 0
        day1_returns = 0
        day7_returns = 0
        day30_returns = 0
        for user_id, date_joined in day0:
            regs_total += 1
            day1_returns += int((user_id, date_joined + timedelta(days=1)) in days)
            day7_returns += int((user_id, date_joined + timedelta(days=7)) in days)
            day30_returns += int((user_id, date_joined + timedelta(days=30)) in days)
        context.update({
            'start_date': self.start_date,
            'end_date': self.end_date,
            'min_date': self.min_date,
            'max_date': self.max_date,
            'd1': round(day1_returns / regs_total * 100, 1) if regs_total else 0,
            'd7': round(day7_returns / regs_total * 100, 1) if regs_total else 0,
            'd30': round(day30_returns / regs_total * 100, 1) if regs_total else 0,
            'regs_total': regs_total,
            'day1_returns': day1_returns,
            'day7_returns': day7_returns,
            'day30_returns': day30_returns,
        })
        return context


class UsersOnlineView(StaffRequiredMixin, CountMixin, TemplateView):
    title = 'Authorized users'
    field_name = 'datetime'

    def set_min_date(self):
        try:
            self.min_date = Visit.objects.values_list('datetime', flat=True).earliest('datetime')
        except Visit.DoesNotExist:
            self.min_date = now()

    def set_points(self):
        dates_counts = list(Visit.objects
                            .filter(datetime__date__gte=self.start_date, datetime__date__lte=self.end_date)
                            .annotate(period=self.extract)
                            .values('period', 'user_id')
                            .annotate(count=Count('id'))
                            .values_list('period', 'user_id', 'count')
                            .order_by('period', 'user_id'))
        for day, user_id, count in dates_counts:
            key = self.date_format(day)
            if not self.points.get(key):
                self.points[key] = 1
            else:
                self.points[key] += 1


class UsersActivityView(StaffRequiredMixin, CountMixin, TemplateView):
    title = 'Activity'
    field_name = 'datetime'
    field_name_user = 'user'
    registrations_points = {}
    active_users_points = {}
    actions_count_points = {}
    template_name = 'stat/users_activity.html'

    def set_min_date(self):
        try:
            self.min_date = Visit.objects.values_list('datetime', flat=True).earliest('datetime')
        except Visit.DoesNotExist:
            self.min_date = now()

    def set_points(self):
        dates_counts = list(Visit.objects
                            .filter(datetime__date__gte=self.start_date, datetime__date__lte=self.end_date)
                            .annotate(period=self.extract)
                            .values('period', 'user_id')
                            .annotate(count=Count('id'))
                            .values_list('period', 'user_id', 'count')
                            .order_by('period', 'user_id'))
        for day, user_id, count in dates_counts:
            key = self.date_format(day)
            if not self.points.get(key):
                self.points[key] = 1
            else:
                self.points[key] += 1

    def set_registrations_points(self):
        self.field_name = 'date_joined'
        self.set_extract()
        dates_counts = self.get_qs(get_user_model())
        for day, count in dates_counts:
            self.registrations_points[self.date_format(day)] = count

    def set_activity_points(self):
        for p in self.active_users_points:
            self.active_users_points[p] = set()
        # statuses
        self.field_name = 'datetime'
        self.field_name_user = 'user'
        self.set_extract()
        dates_users_count = self.get_qs_activity(Status)
        for day, user, count in dates_users_count:
            try:
                self.active_users_points[self.date_format(day)].add(user)
                self.actions_count_points[self.date_format(day)] += count
            except KeyError:
                pass
        # collections
        self.field_name = 'created'
        self.field_name_user = 'creator'
        self.set_extract()
        dates_users_count = self.get_qs_activity(Collection)
        for day, user, count in dates_users_count:
            try:
                self.active_users_points[self.date_format(day)].add(user)
                self.actions_count_points[self.date_format(day)] += count
            except KeyError:
                pass
        # reviews
        self.field_name = 'created'
        self.field_name_user = 'user'
        self.set_extract()
        dates_users_count = self.get_qs_activity(Review)
        for day, user, count in dates_users_count:
            try:
                self.active_users_points[self.date_format(day)].add(user)
                self.actions_count_points[self.date_format(day)] += count
            except KeyError:
                pass
        # comments
        self.field_name = 'created'
        self.field_name_user = 'user'
        self.set_extract()
        dates_users_count = self.get_qs_activity(CommentReview)
        for day, user, count in dates_users_count:
            try:
                self.active_users_points[self.date_format(day)].add(user)
                self.actions_count_points[self.date_format(day)] += count
            except KeyError:
                pass
        dates_users_count = self.get_qs_activity(CommentCollectionFeed)
        for day, user, count in dates_users_count:
            try:
                self.active_users_points[self.date_format(day)].add(user)
                self.actions_count_points[self.date_format(day)] += count
            except KeyError:
                pass
        dates_users_count = self.get_qs_activity(CommentDiscussion)
        for day, user, count in dates_users_count:
            try:
                self.active_users_points[self.date_format(day)].add(user)
                self.actions_count_points[self.date_format(day)] += count
            except KeyError:
                pass
        # followings
        self.field_name = 'added'
        self.field_name_user = 'user'
        self.set_extract()
        dates_users_count = self.get_qs_activity(
            qs=UserFollowElement.objects.filter(content_type=CommonContentType().get(get_user_model()))
        )
        for day, user, count in dates_users_count:
            try:
                self.active_users_points[self.date_format(day)].add(user)
                self.actions_count_points[self.date_format(day)] += count
            except KeyError:
                pass
        dates_users_count = self.get_qs_activity(
            qs=UserFollowElement.objects.filter(content_type=CommonContentType().get(Collection))
        )
        for day, user, count in dates_users_count:
            try:
                self.active_users_points[self.date_format(day)].add(user)
                self.actions_count_points[self.date_format(day)] += count
            except KeyError:
                pass
        # total
        for p in self.active_users_points:
            self.active_users_points[p] = len(self.active_users_points[p])

    def get_qs_activity(self, model=None, qs=None):
        if qs is None and model:
            qs = model.objects
        return list(
            qs.filter(**{
                '{}__date__gte'.format(self.field_name): self.start_date,
                '{}__date__lte'.format(self.field_name): self.end_date
            })
            .annotate(period=self.extract)
            .values('period', self.field_name_user)
            .annotate(count=Count('id'))
            .values_list('period', self.field_name_user, 'count')
            .order_by('period')
        )

    def get_context_data(self, **kwargs):
        self.is_users = self.request.GET.get('users')
        self.is_middle = self.request.GET.get('middle')
        is_actions = self.request.GET.get('actions')
        self.set_min_date()
        self.set_dates()

        self.set_empty_points()
        self.registrations_points = self.points.copy()
        self.active_users_points = self.points.copy()
        self.actions_count_points = self.points.copy()

        self.set_points()
        self.set_registrations_points()
        self.set_activity_points()
        if self.is_users or self.is_middle:
            self.set_middle_points()

        context = self.get_context({}, self.title)
        context.update({
            'registrations_points': list(self.registrations_points.values()),
            'active_users_points': list(self.active_users_points.values()),
            'is_actions': is_actions,
        })
        if is_actions:
            context['actions_count_points'] = list(self.actions_count_points.values())
        return context


class DataStatusesView(StaffRequiredMixin, CountMixin, TemplateView):
    title = 'Statuses'
    field_name = 'datetime'

    def set_min_date(self):
        try:
            self.min_date = Status.objects.values_list('datetime', flat=True).earliest('datetime')
        except Status.DoesNotExist:
            self.min_date = now()

    def set_points(self):
        dates_counts = self.get_qs(Status)
        for day, count in dates_counts:
            self.points[self.date_format(day)] = count


class DataCollectionsView(StaffRequiredMixin, CountMixin, TemplateView):
    title = 'Collections'
    field_name = 'created'

    def set_min_date(self):
        try:
            self.min_date = Collection.objects.values_list('created', flat=True).earliest('created')
        except Collection.DoesNotExist:
            self.min_date = now()

    def set_points(self):
        dates_counts = self.get_qs(Collection)
        for day, count in dates_counts:
            self.points[self.date_format(day)] = count


class DataReviewsView(StaffRequiredMixin, CountMixin, TemplateView):
    title = 'Reviews'
    field_name = 'created'

    def set_min_date(self):
        try:
            self.min_date = Review.objects.values_list('created', flat=True).earliest('created')
        except Review.DoesNotExist:
            self.min_date = now()

    def set_points(self):
        dates_counts = self.get_qs(Review)
        for day, count in dates_counts:
            self.points[self.date_format(day)] = count


class DataCommentsView(StaffRequiredMixin, CountMixin, TemplateView):
    title = 'Comments'
    field_name = 'created'

    def set_min_date(self):
        try:
            self.min_date = min(
                CommentReview.objects.values_list('created', flat=True).earliest('created'),
                CommentCollectionFeed.objects.values_list('created', flat=True).earliest('created'),
                CommentDiscussion.objects.values_list('created', flat=True).earliest('created'),
            )
        except (CommentReview.DoesNotExist, CommentCollectionFeed.DoesNotExist, CommentDiscussion.DoesNotExist):
            self.min_date = now()

    def set_points(self):
        dates_counts = OrderedDict(self.get_qs(CommentReview))
        dates_counts_append = self.get_qs(CommentCollectionFeed)
        for day, count in dates_counts_append:
            dates_counts[day] = count
        dates_counts_append = self.get_qs(CommentDiscussion)
        for day, count in dates_counts_append:
            dates_counts[day] = count
        self.points = OrderedDict()
        for day in sorted(dates_counts):
            self.points[self.date_format(day)] = dates_counts[day]


class DataFollowingsView(StaffRequiredMixin, CountMixin, TemplateView):
    title = 'Followings'
    field_name = 'added'

    def set_min_date(self):
        try:
            self.min_date = UserFollowElement.objects.filter(content_type=CommonContentType().get(get_user_model())) \
                .values_list('added', flat=True).earliest('added')
        except UserFollowElement.DoesNotExist:
            self.min_date = now()

    def set_points(self):
        dates_counts = self.get_qs(
            qs=UserFollowElement.objects.filter(content_type=CommonContentType().get(get_user_model()))
        )
        self.points = OrderedDict()
        for day, count in dates_counts:
            self.points[self.date_format(day)] = count


class DataGamesView(StaffRequiredMixin, CountMixin, TemplateView):
    title = 'Games'
    field_name = 'created'

    def set_min_date(self):
        try:
            self.min_date = UserGame.objects.visible().values_list('created', flat=True).earliest('created')
        except UserGame.DoesNotExist:
            self.min_date = now()

    def set_points(self):
        dates_counts = self.get_qs(qs=UserGame.objects.visible())
        for day, count in dates_counts:
            self.points[self.date_format(day)] = count
        # convert to total
        new_points = OrderedDict()
        total = 0
        for point in self.points:
            total += self.points[point]
            new_points[point] = total
        append_count = UserGame.objects.visible().count() - total
        for point in new_points:
            new_points[point] += append_count
        self.points = new_points


class GamesStatusesView(StaffRequiredMixin, DatesRangeMixin, TemplateView):
    template_name = 'stat/games_statuses.html'

    def get_default_min_date(self):
        return self.min_date

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        status = self.request.GET.get('status')
        limit = self.request.GET.get('count')
        if type(limit) is str and limit.isdigit():
            limit = int(limit)
        else:
            limit = 30
        try:
            self.min_date = UserGame.objects.visible().values_list('added', flat=True).earliest('added')
        except UserGame.DoesNotExist:
            self.min_date = now()
        self.set_dates()

        qs = UserGame.objects.visible()
        if status:
            qs = qs.filter(status=status)
        data = list(qs
                    .filter(added__date__gte=self.start_date, added__date__lte=self.end_date)
                    .values('game_id')
                    .annotate(count=Count('id'))
                    .values_list('game_id', 'count')
                    .order_by('-count'))[0:limit]
        games = Game.objects.only('id', 'name').in_bulk([game_id for game_id, _ in data])
        self.points = []
        for game_id, count in data:
            self.points.append((games[game_id].name, count))

        context.update({
            'start_date': self.start_date,
            'end_date': self.end_date,
            'min_date': self.min_date,
            'max_date': self.max_date,
            'points': self.points,
            'count': limit,
            'status': status,
            'statuses': UserGame.STATUSES,
        })
        return context


class GamesRevisionsView(StaffRequiredMixin, DatesRangeMixin, TemplateView):
    template_name = 'stat/games_revisions.html'

    def get_default_min_date(self):
        return self.min_date

    def get_context_data(self, **kwargs):
        try:
            self.min_date = Revision.objects.values_list('date_created', flat=True).earliest('date_created')
        except Revision.DoesNotExist:
            self.min_date = now()
        self.set_dates()
        group = int_or_number(self.request.GET.get('group'))
        data = list(Revision.objects.filter(user__groups__in=[group])
                    .filter(date_created__date__gte=self.start_date, date_created__date__lte=self.end_date)
                    .values('user_id')
                    .annotate(count=Count('id'))
                    .values_list('user_id', 'count')
                    .order_by('-count'))
        users = get_user_model().objects.only('id', 'username').in_bulk([user_id for user_id, _ in data])
        self.points = []
        for user_id, count in data:
            self.points.append((users[user_id].username, count))

        context = super().get_context_data(**kwargs)
        context.update({
            'start_date': self.start_date,
            'end_date': self.end_date,
            'min_date': self.min_date,
            'max_date': self.max_date,
            'points': self.points,
            'group': group,
            'groups': Group.objects.values_list('id', 'name'),
        })
        return context


class RecommendationsTotalsView(StaffRequiredMixin, CountMixin, TemplateView):
    title = 'Recommendations Totals'
    field_name = 'datetime'
    field_name_user = 'user'
    recommendations_visits_points = {}
    recommended_games_visits_points = {}
    recommended_games_adding_points = {}
    recommended_games_stores_visits_points = {}
    template_name = 'stat/recommendations_totals.html'

    def set_min_date(self):
        try:
            self.min_date = RecommendationsVisit.objects.values_list('datetime', flat=True).earliest('datetime')
        except RecommendationsVisit.DoesNotExist:
            self.min_date = now()

    def set_points(self):
        dates_counts = list(
            Visit.objects
            .filter(datetime__date__gte=self.start_date, datetime__date__lte=self.end_date)
            .annotate(period=self.extract)
            .values('period', 'user_id')
            .annotate(count=Count('id'))
            .values_list('period', 'user_id', 'count')
            .order_by('period', 'user_id')
        )
        for day, user_id, count in dates_counts:
            key = self.date_format(day)
            if not self.points.get(key):
                self.points[key] = 1
            else:
                self.points[key] += 1

    def set_recommendations_visits_points(self):
        self.set_extract()
        dates_counts = self.get_qs(RecommendationsVisit)
        for day, count in dates_counts:
            self.recommendations_visits_points[self.date_format(day)] = count

    def set_recommended_games_visits_points(self, is_recommended_games_visits_main):
        self.set_extract()
        if is_recommended_games_visits_main:
            dates_counts = self.get_qs(qs=RecommendedGameVisit.objects.filter(referer='/'))
        else:
            dates_counts = self.get_qs(RecommendedGameVisit)
        for day, count in dates_counts:
            self.recommended_games_visits_points[self.date_format(day)] = count

    def set_recommended_games_adding_points(
        self, is_recommended_games_adding_main, is_recommended_games_adding_wishlist
    ):
        self.set_extract()
        if not is_recommended_games_adding_main and not is_recommended_games_adding_wishlist:
            dates_counts = self.get_qs(RecommendedGameAdding)
        else:
            qs = RecommendedGameAdding.objects
            if is_recommended_games_adding_main:
                qs = qs.filter(referer='/')
            if is_recommended_games_adding_wishlist:
                qs = qs.filter(status=UserGame.STATUS_TOPLAY)
            dates_counts = self.get_qs(qs=qs)
        for day, count in dates_counts:
            self.recommended_games_adding_points[self.date_format(day)] = count

    def set_recommended_games_stores_visits_points(self):
        self.set_extract()
        dates_counts = self.get_qs(RecommendedGameStoreVisit)
        for day, count in dates_counts:
            self.recommended_games_stores_visits_points[self.date_format(day)] = count

    def get_context_data(self, **kwargs):
        is_recommended_games_visits_main = (
            self.request.GET.get('recommended_games_visits_main') or not self.request.GET.get('start')
        )
        is_recommended_games_adding_main = self.request.GET.get('recommended_games_adding_main')
        is_recommended_games_adding_wishlist = self.request.GET.get('recommended_games_adding_wishlist')
        self.set_min_date()
        self.set_dates()

        self.set_empty_points()
        self.recommendations_visits_points = self.points.copy()
        self.recommended_games_visits_points = self.points.copy()
        self.recommended_games_adding_points = self.points.copy()
        self.recommended_games_stores_visits_points = self.points.copy()

        self.set_points()
        self.set_recommendations_visits_points()
        self.set_recommended_games_visits_points(is_recommended_games_visits_main)
        self.set_recommended_games_adding_points(
            is_recommended_games_adding_main, is_recommended_games_adding_wishlist
        )
        self.set_recommended_games_stores_visits_points()

        context = self.get_context({}, self.title)
        context.update({
            'recommendations_visits_points': list(self.recommendations_visits_points.values()),
            'recommended_games_visits_points': list(self.recommended_games_visits_points.values()),
            'recommended_games_adding_points': list(self.recommended_games_adding_points.values()),
            'recommended_games_stores_visits_points': list(self.recommended_games_stores_visits_points.values()),
            'is_recommended_games_visits_main': is_recommended_games_visits_main,
            'is_recommended_games_adding_main': is_recommended_games_adding_main,
            'is_recommended_games_adding_wishlist': is_recommended_games_adding_wishlist,
        })
        return context


class APIUserAgentView(StaffRequiredMixin, DatesRangeMixin, TemplateView):
    template_name = 'stat/api_stat.html'
    model = APIByUserAgentVisit
    title = 'API using by User Agent'
    table_header = 'User Agent'
    field = 'user_agent'
    fields = None

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        limit = self.request.GET.get('count')
        if type(limit) is str and limit.isdigit():
            limit = int(limit)
        else:
            limit = 30
        try:
            self.min_date = datetime.combine(
                self.model.objects.values_list('date', flat=True).earliest('date'),
                datetime.min.time(),
                tzinfo=timezone.utc,
            )
        except self.model.DoesNotExist:
            self.min_date = now()
        self.set_dates()

        values = self.fields or (self.field,)
        points = list(
            self.model.objects
            .filter(date__gte=self.start_date, date__lte=self.end_date)
            .values(*values)
            .annotate(count=Sum('count'))
            .values_list(*values, 'count')
            .order_by('-count')
        )[0:limit]

        if self.fields:
            points = [(' / '.join(point[:-1]), point[-1]) for point in points]

        self.points = points

        total = (
            self.model.objects
            .filter(date__gte=self.start_date, date__lte=self.end_date)
            .aggregate(Sum('count'))['count__sum']
        )

        context.update({
            'start_date': self.start_date,
            'end_date': self.end_date,
            'min_date': self.min_date,
            'max_date': self.max_date,
            'points': self.points,
            'count': limit,
            'statuses': UserGame.STATUSES,
            'total': total,
            'title': self.title,
            'table_header': self.table_header,
        })
        return context


class APIIPView(APIUserAgentView):
    model = APIByIPVisit
    title = 'API using by IP'
    table_header = 'IP'
    field = 'ip'


class APIIPAndUserAgentView(APIUserAgentView):
    model = APIByIPAndUserAgentVisit
    title = 'API using by IP and User Agent'
    table_header = 'IP and User Agent'
    fields = ('user_agent', 'ip')


class APIUserView(APIUserAgentView):
    model = APIByUserVisit
    title = 'API using by User'
    table_header = 'User'
    field = 'user_id'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        users_ids = [user_id for user_id, _ in context['points'] if int_or_none(user_id)]
        if users_ids:
            new_points = []
            users = get_user_model().objects.only('id', 'api_email', 'api_url', 'api_description').in_bulk(users_ids)
            for user_id, count in context['points']:
                user = users.get(int_or_none(user_id))
                if not user:
                    new_points.append([user_id, count])
                    continue
                new_points.append([
                    '{}\n{}\n{}\n{}'.format(
                        user.id,
                        user.api_email,
                        user.api_url,
                        user.api_description,
                    ),
                    count,
                ])
            context['points'] = self.points = new_points
        return context
