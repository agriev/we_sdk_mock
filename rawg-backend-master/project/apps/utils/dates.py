import calendar
from datetime import datetime, timedelta

from django.core.exceptions import ValidationError
from django.forms import DateField
from django.utils.timezone import now


def diff_month(d1, d2):
    return (d2.year - d1.year) * 12 + d2.month - d1.month


def diff_week(d1, d2):
    monday1 = d1 - timedelta(days=d1.weekday())
    monday2 = d2 - timedelta(days=d2.weekday())
    return int((monday2 - monday1).days / 7)


def monday(d):
    d = d.replace(hour=0, minute=0, second=0, microsecond=0)
    return d - timedelta(days=d.weekday())


def yesterday(days=1):
    d = now().replace(hour=0, minute=0, second=0, microsecond=0)
    return d - timedelta(days=days)


def midnight(d=None):
    if not d:
        d = now()
    return d.replace(hour=0, minute=0, second=0, microsecond=0)


def tomorrow(days=1):
    d = now().replace(hour=0, minute=0, second=0, microsecond=0)
    return d + timedelta(days=days)


def first_day_of_month(d=None):
    if not d:
        d = now()
    return d.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def last_day_of_month(year, month):
    return calendar.monthrange(year, month)[1]


def get_localized_date(date):
    formats = (
        '%Y-%m-%d', '%d.%m.%Y', '%d/%m/%Y', '%d-%m-%Y',
        '%d %B, %Y', '%B %d, %Y', '%B %d'
    )
    for fmt in formats:
        try:
            date = datetime.strptime(date, fmt)
            if date.year == 1900:
                date = date.replace(year=datetime.now().year)
            return date
        except ValueError:
            pass
    raise ValueError('no valid date format found')


def split_dates(dates=None):
    if not dates:
        return
    from_date, to_date = dates.split(',')
    date_field = DateField()
    try:
        from_date = date_field.to_python(from_date)
        to_date = date_field.to_python(to_date)
        return [from_date, to_date]
    except ValidationError:
        return
