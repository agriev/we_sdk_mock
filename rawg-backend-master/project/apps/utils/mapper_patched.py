import dataclasses
from collections import Iterable, OrderedDict
from typing import Sequence, Type

from attr import attr, attrs
from django.conf import settings
from django.db.models import Model
from django.db.models.query import ValuesListIterable
from modeltranslation.utils import build_localized_fieldname
from rest_framework import serializers
from rest_framework.fields import Field

from apps.utils.mappers.entities import entity_fields_factory
from apps.utils.mappers.mapper import (
    Evaluated, Mapper as DefaultMapper, Reader as DefaultReader, ReaderGetter as DefaultReaderGetter,
    get_flat_values_list_iterable_class, get_values_list_arguments, is_django_model, validate_fields,
)

value_types = {
    int: serializers.IntegerField,
    str: serializers.CharField,
    tuple: serializers.ChoiceField,
    list: serializers.ChoiceField,
    dict: serializers.JSONField,
    OrderedDict: serializers.JSONField,
}


class Translated(str):
    pass


class Calculated(Evaluated):
    def __init__(self, name=None, value_type=None):
        self.value_type = value_type
        self.serializer_type = value_types[value_type]()
        super().__init__(name)


def entity_wrapper(entity, post_init, additional_fields, remove_fields, translated_fields, data_source):
    def inner(*args, **kwargs):
        entity_fields = [field.name for field in dataclasses.fields(entity)]
        fields_count = len(additional_fields)
        fields = args[len(args) - fields_count:]
        entity_args = args[:len(args) - fields_count]
        new_args = []
        skip = 0
        for i, field in enumerate(entity_fields):
            if field in translated_fields:
                languages_count = len(settings.LANGUAGES) + 1
                languages = entity_args[i:i + languages_count]
                obj = data_source()
                setattr(obj, field, languages[0])
                for j, (lang, _) in enumerate(settings.LANGUAGES):
                    setattr(obj, build_localized_fieldname(field, lang), languages[j + 1])
                    skip -= 1
                new_args.append(getattr(obj, field))
            elif field in remove_fields:
                new_args.append(None)
                skip += 1
            else:
                new_args.append(entity_args[i - skip])
        obj = entity(*new_args)
        if post_init:
            post_init(obj, *fields)
        return obj
    return inner


class Mapper(DefaultMapper):
    values_list_arguments: list = []
    values_list_iterable_class: Type[ValuesListIterable] = None
    serializer_fields: list = []
    serializer_fields_calculated: Sequence[Field] = []
    wrapped_entity: dataclasses.dataclass = None

    def __init__(
        self, entity=None, data_source=None, config=None,
        additional_fields=None, post_init=None, hide_from_serializer=None
    ):
        self.entity = entity
        self.data_source = data_source
        self.config = config or {}
        configure(self, additional_fields, post_init, hide_from_serializer)

    @property
    def reader(self):
        return ReaderGetter(self)

    def reader_plain(self, obj: Model):
        args = (getattr(obj, arg) for arg in self.values_list_arguments)
        return self.wrapped_entity(*args)


class ReaderGetter(DefaultReaderGetter):
    def __call__(self, f):
        super().__call__(f)
        return Reader(f, self.mapper, self.ret)


class Reader(DefaultReader):
    def __init__(self, f, mapper, ret):
        super().__init__(f, mapper, ret)
        self.model = mapper.data_source

    def __call__(self, *args, **kwargs):
        try:
            result = super().__call__(*args, **kwargs)
        except self.model.DoesNotExist:
            return None
        if self.post_iterate:
            if isinstance(result, Iterable):
                for i, row in enumerate(result):
                    self.post_iterate(row, i)
            else:
                self.post_iterate(result, 0)
        return result

    def raw(self, *args, **kwargs):
        result = self.f(*args, **kwargs)
        self.post_iterate = None
        if type(result) is tuple:
            result, self.post_iterate = result
        result = result.values_list(*self.values_list_arguments)
        result._iterable_class = self.values_list_iterable_class
        return result


def configure(mapper, additional_fields, post_init, hide_from_serializer):
    if not additional_fields:
        additional_fields = []
    if not hide_from_serializer:
        hide_from_serializer = []

    fields, entity_factory = entity_fields_factory(mapper.entity)
    assert is_django_model(mapper.data_source)
    assert isinstance(mapper.config, dict)

    # validate
    not_mapper_fields = {
        field: field_type for field, field_type in fields.items()
        if not isinstance(mapper.config.get(field, field), Mapper)
    }
    validate_fields(not_mapper_fields, mapper.data_source, mapper.config)
    for field, field_type in fields.items():
        if isinstance(mapper.config.get(field, field), Mapper):
            validate_mapper_field(field, field_type, mapper, mapper.data_source)

    # values list
    mapper.values_list_arguments = get_values_list_arguments(fields, mapper.config)

    # translated
    translated_fields = []
    if Translated in fields.values():
        new_values_list_arguments = []
        translated_names = [f[0] for f in filter(lambda f: f[1] is Translated, fields.items())]
        for i, value in enumerate(mapper.values_list_arguments):
            if value in translated_names:
                translated_fields.append(value)
                new_values_list_arguments.append(value)
                for lang, _ in settings.LANGUAGES:
                    new_values_list_arguments.append(build_localized_fieldname(value, lang))
                continue
            new_values_list_arguments.append(value)
        mapper.values_list_arguments = new_values_list_arguments

    # add custom values list
    if additional_fields:
        mapper.values_list_arguments = list(mapper.values_list_arguments) + list(additional_fields)

    # remove calculated fields
    remove_fields = []
    serializer_fields = []
    for field in fields:
        value = mapper.config.get(field, field)
        if isinstance(value, Calculated):
            remove_fields.append(field)
            serializer_fields.append((field, value.serializer_type))
    if remove_fields:
        mapper.values_list_arguments = [field for field in mapper.values_list_arguments if field not in remove_fields]

    # wrap to post process
    mapper.wrapped_entity = entity_wrapper(
        entity_factory, post_init, additional_fields, remove_fields, translated_fields, mapper.data_source
    )
    mapper.values_list_iterable_class = get_values_list_iterable_class(
        mapper.wrapped_entity, fields, mapper.config, additional_fields
    )

    # add fields for serializer
    serializer_list = []
    for field in fields:
        value = mapper.config.get(field)
        if isinstance(value, str):
            serializer_fields.append((field, value_types[str]()))
        elif isinstance(value, Mapper):
            serializer_fields.append((field, get_serializer(value.data_source, value)()))
        serializer_list.append(field)
    mapper.serializer_fields = [
        field for field in serializer_list + remove_fields if field not in hide_from_serializer
    ]
    mapper.serializer_fields_calculated = [
        field for field in serializer_fields if field[0] not in hide_from_serializer
    ]


def validate_mapper_field(field, field_type, mapper, data_source):
    model_fields = data_source._meta.get_fields()
    for model_field in model_fields:
        if model_field.name == field:
            assert model_field.is_relation
            assert isinstance(getattr(model_field, 'attname', object()), str)
            break
    else:
        raise Exception(f'Can not find "{field}" field in the "{data_source}" model')


def get_values_list_iterable_class(entity_factory, fields, config, additional_fields):
    if any(isinstance(value, Mapper) for value in config.values()):
        return get_nested_values_list_iterable_class(entity_factory, fields, config, additional_fields)
    else:
        return get_flat_values_list_iterable_class(entity_factory)


def get_nested_values_list_iterable_class(entity, fields, config, additional_fields):
    getters = []
    offset = 0
    for field in fields:
        target_field = config.get(field, field)
        if isinstance(target_field, Calculated):
            continue
        elif isinstance(target_field, Mapper):
            limit = offset + len(target_field.values_list_arguments)

            def getter(_row, _entity=target_field.wrapped_entity, _offset=offset, _limit=limit):
                return _entity(*(_row[_offset:_limit]))

            getters.append(getter)
            offset = limit
        else:
            def getter(_row, _offset=offset):
                return _row[_offset]

            getters.append(getter)
            offset += 1

    if additional_fields:
        for i in range(0, len(additional_fields)):
            def getter(_row, _offset=offset):
                return _row[_offset]

            getters.append(getter)

    class _ValuesListIterable(ValuesListIterable):
        def __iter__(self):
            for row in super(_ValuesListIterable, self).__iter__():
                yield entity(*(_getter(row) for _getter in getters))

    return _ValuesListIterable


def get_serializer(model_class: Type[Model], mapper: Mapper) -> Type[serializers.ModelSerializer]:
    class MapperSerializer(serializers.ModelSerializer):
        class Meta:
            model = model_class
            ref_name = model_class.__name__

        def get_fields(self):
            for field, field_type in mapper.serializer_fields_calculated:
                self._declared_fields[field] = field_type
            return super().get_fields()

        def get_field_names(self, declared_fields, info):
            self.Meta.fields = mapper.serializer_fields
            return super().get_field_names(declared_fields, info)

        def get_extra_kwargs(self):
            self.Meta.read_only_fields = mapper.serializer_fields
            return super().get_extra_kwargs()

    return MapperSerializer


@attrs
class Serializer:
    model_class: Type[Model] = attr()
    mapper: Mapper = attr()

    def __call__(self, *args, **kwargs) -> Type[serializers.ModelSerializer]:
        return get_serializer(self.model_class, self.mapper)
