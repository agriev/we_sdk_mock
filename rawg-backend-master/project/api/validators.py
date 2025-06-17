import operator
import typing
from functools import partial

from rest_framework import serializers

T = typing.TypeVar('T')


def compare(operation: typing.Callable[[T, T], bool], b: T, exc_message=''):
    def validator(a: T):
         if not operation(a, b):
             raise serializers.ValidationError(exc_message) if exc_message else serializers.ValidationError
    return validator


equals = partial(compare, operator.eq)
greater = partial(compare, operator.gt)
less = partial(compare, operator.lt)
contains = partial(compare, operator.contains)


def one_of(container: typing.Container, exc_message: str = ''):
    def validator(a: T):
        if not a in container:
            raise serializers.ValidationError(exc_message) if exc_message else serializers.ValidationError
    return validator


def validate_fields(**kwargs: typing.List[typing.Callable[[T], None]]):
    '''Used to validate nested serializer data'''
    def inner(data: typing.OrderedDict) -> None:
        for field_name, validators in kwargs.items():
            value = data[field_name]
            for validator in validators:
                validator(value)
    return inner


def wrap_validation_error(callable: typing.Callable[..., typing.Any], exception_type: typing.Type[Exception]):
    '''Catches ValidationError and raises `exception_type` exception instead'''
    def inner(*args, **kwargs):
        try:
            return callable(*args, **kwargs)
        except serializers.ValidationError as e:
            raise exception_type from e
    return inner
