import operator
from typing import List, Optional

from django.db.models import Model as DjangoModel
from django.db.models.query import ValuesListIterable

from apps.utils.mappers.entities import entity_fields_factory


class Evaluated(object):
    def __init__(self, name=None):
        self.name = name


def mapper_factory(entity=None, data_source=None, config=None):
    entity, data_source, config = decompose(entity, data_source, config)
    if entity and data_source:
        return Mapper(entity, data_source, config)
    else:
        return LazyMapper(config)


class LazyMapper(object):
    def __init__(self, config):
        self.config = config

    def build(self, entity, data_source):
        return Mapper(entity, data_source, self.config)


class Mapper(object):
    def __init__(self, entity, data_source, config):
        self.entity = entity
        self.data_source = data_source
        self.config = config
        configure(self)

    @property
    def reader(self):
        return ReaderGetter(self)


def decompose(first, second, third):
    if first is None and second is None and third is None:
        return None, None, {}
    elif isinstance(first, dict):
        return None, None, first
    elif first is not None and is_django_model(second):
        return first, second, third or {}
    else:
        raise Exception


def configure(mapper):
    fields, entity_factory = entity_fields_factory(mapper.entity)
    assert is_django_model(mapper.data_source)
    assert isinstance(mapper.config, dict)
    validate_fields(fields, mapper.data_source, mapper.config)
    mapper.values_list_arguments = get_values_list_arguments(fields, mapper.config)
    mapper.values_list_iterable_class = get_values_list_iterable_class(
        entity_factory, fields, mapper.config
    )
    mapper.entity_factory = entity_factory


class ReaderGetter(object):
    def __init__(self, mapper):
        self.mapper = mapper
        self.ret = None

    def __call__(self, f):
        if self.ret is None:
            self.ret = f.__annotations__["return"]
        return Reader(f, self.mapper, self.ret)

    def of(self, ret):
        self.ret = ret
        return self


class Reader(object):
    def __init__(self, f, mapper, ret):
        self.f = f
        self.values_list_arguments = mapper.values_list_arguments
        self.values_list_iterable_class = mapper.values_list_iterable_class
        self.converter = get_converter(ret, mapper.entity)

    def __call__(self, *args, **kwargs):
        return self.converter(self.raw(*args, **kwargs))

    def raw(self, *args, **kwargs):
        result = self.f(*args, **kwargs).values_list(*self.values_list_arguments)
        result._iterable_class = self.values_list_iterable_class
        return result


def get_converter(ret, entity):
    if ret is entity:
        return operator.methodcaller("get")
    elif ret == List[entity]:
        return list
    elif ret == Optional[entity]:
        return operator.methodcaller("first")
    else:
        return lambda x: x


# Django.


def is_django_model(data_source):
    return issubclass(data_source, DjangoModel)


def validate_fields(fields, data_source, config):
    for field, field_type in fields.items():
        target_field = config.get(field, field)
        if isinstance(target_field, Evaluated):
            pass
        elif isinstance(target_field, LazyMapper):
            mapper = validate_mapper_field(field, field_type, target_field, data_source)
            config[field] = mapper
        elif isinstance(target_field, str):
            validate_field(target_field, data_source)
        elif isinstance(target_field, tuple):
            assert len(target_field) > 1
            assert all(isinstance(path_field, str) for path_field in target_field)
            model = data_source
            for path_field in target_field[:-1]:
                model_fields = model._meta.get_fields()
                for model_field in model_fields:
                    if model_field.name == path_field:
                        assert model_field.is_relation
                        assert isinstance(
                            getattr(model_field, "attname", object()), str
                        )
                        model = model_field.related_model
                        break
                else:
                    raise Exception(
                        "Can not find '%s' field in the %s model" % (field, model)
                    )
            validate_field(target_field[-1], model)
        else:
            raise Exception(
                "Unknown config value %s in the '%s' field" % (target_field, field)
            )


def validate_field(validation_field, data_source):
    model_fields = data_source._meta.get_fields()
    for model_field in model_fields:
        if validation_field == model_field.name:
            break
        elif model_field.is_relation and validation_field == getattr(
            model_field, "attname", object()
        ):
            break
    else:
        raise Exception(
            "Can not find '%s' field in the %s model" % (validation_field, data_source)
        )


def validate_mapper_field(field, field_type, lazy_mapper, data_source):
    model_fields = data_source._meta.get_fields()
    for model_field in model_fields:
        if model_field.name == field:
            assert model_field.is_relation
            assert isinstance(getattr(model_field, "attname", object()), str)
            mapper = lazy_mapper.build(field_type, model_field.related_model)
            return mapper
    else:
        raise Exception(
            "Can not find '%s' field in the %s model" % (field, data_source)
        )


def get_values_list_arguments(fields, config):
    def add(field):
        value = config.get(field, field)
        if isinstance(value, Mapper):
            result.extend(
                field + "__" + argument for argument in value.values_list_arguments
            )
            return
        elif isinstance(value, Evaluated):
            if value.name is None:
                value = field
            else:
                value = value.name
        elif isinstance(value, tuple):
            value = "__".join(value)
        elif isinstance(value, LazyMapper):
            raise RuntimeError
        result.append(value)

    result = []

    for field in fields:
        add(field)

    return tuple(result)


def get_values_list_iterable_class(entity_factory, fields, config):
    if any(isinstance(value, Mapper) for value in config.values()):
        return get_nested_values_list_iterable_class(entity_factory, fields, config)
    else:
        return get_flat_values_list_iterable_class(entity_factory)


def get_flat_values_list_iterable_class(entity_factory):
    class _ValuesListIterable(ValuesListIterable):
        def __iter__(self):
            for row in super(_ValuesListIterable, self).__iter__():
                yield entity_factory(*row)

    return _ValuesListIterable


def get_nested_values_list_iterable_class(entity_factory, fields, config):
    getters = []
    offset = 0
    for field in fields:
        target_field = config.get(field, field)
        if isinstance(target_field, Mapper):
            limit = offset + len(target_field.values_list_arguments)
            nested_factory = target_field.entity_factory

            def getter(_row, _factory=nested_factory, _offset=offset, _limit=limit):
                return _factory(*(_row[_offset:_limit]))

            getters.append(getter)
            offset = limit
        else:

            def getter(_row, _offset=offset):
                return _row[_offset]

            getters.append(getter)
            offset += 1

    class _ValuesListIterable(ValuesListIterable):
        def __iter__(self):
            for row in super(_ValuesListIterable, self).__iter__():
                yield entity_factory(*(getter(row) for getter in getters))

    return _ValuesListIterable
