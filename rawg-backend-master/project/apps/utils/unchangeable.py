from django.core.exceptions import ValidationError
from django.db import models


def add_fields(fields):
    for field in fields:
        yield field
        if field.endswith('_id'):
            yield field[0:-3]


def error(field):
    return ValidationError('You cannot change the {} field'.format(field))


def unchangeable_pre_save(sender, instance, **kwargs):
    if instance.id:
        fields = list(add_fields(instance.__class__.unchangeable_fields))
        for field in fields:
            try:
                if instance.is_init_change(field, kwargs):
                    raise error(field)
            except AttributeError:
                with_id = '{}_id'.format(field)
                if with_id not in fields:
                    raise
                init_value = instance.get_init_field(with_id)
                value = getattr(instance, field)
                if (not value and init_value) or init_value != value.id:
                    raise error(field)


class UnchangeableQuerySet(models.QuerySet):
    def update(self, **kwargs):
        for field in add_fields(self.model.unchangeable_fields):
            if field in kwargs:
                raise error(field)
        return super().update(**kwargs)
