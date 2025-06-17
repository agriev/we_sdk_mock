import typing
from typing import Optional

from django.http import Http404
from rest_framework.generics import get_object_or_404


def true(param):
    return param not in ('false', '0', None, False, 0)


def int_or_none(s: str) -> typing.Optional[int]:
    try:
        return int(s)
    except (ValueError, TypeError):
        return None


def int_or_number(s: str, num: int = 0) -> int:
    return int_or_none(s) or num


def get_object_or_none(queryset, *filter_args, **filter_kwargs):
    try:
        return get_object_or_404(queryset, *filter_args, **filter_kwargs)
    except Http404:
        return None


def filter_int_or_none(data: str) -> Optional[list]:
    if not data:
        return None
    data = [int_or_none(f) for f in data.split(',')]
    if not data:
        return None
    if None in data:
        return None
    return data
