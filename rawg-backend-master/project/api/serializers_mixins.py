from random import uniform
from time import sleep

import reversion
from django.conf import settings
from django.core.exceptions import FieldDoesNotExist
from django.db import IntegrityError
from django.utils import translation
from psycopg2 import errorcodes
from rest_framework import serializers
from rest_framework.utils.field_mapping import get_field_kwargs


class CanDeleteMixin:
    def can_delete(self, obj):
        user = self.context['request'].user
        if user.is_authenticated:
            if user.is_superuser:
                return True
            if user.is_staff and user.has_perm('{}.delete_{}'.format(obj._meta.app_label, obj._meta.model_name)):
                return True
            return user.id == obj.user_id
        return False


class RetryCreateMixin:
    retry_fields = {}

    def create(self, validated_data):
        try:
            return super().create(validated_data)
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
            sleep(uniform(0.1, 0.3))
            validated_data.update(self.retry_fields)
            self.create(validated_data)


class SearchMixin:
    def convert_ids_to_objects(self, data, params, flat=False):
        for raw, attr, parent in params:
            clear_raw = raw.replace('_ids', '')
            if clear_raw != raw:
                data[clear_raw] = []
            if data.get(raw) and type(data[raw][0]) is int:
                parents = set()
                objects = []
                for pk in data[raw]:
                    record = getattr(self, 'all_{}'.format(clear_raw)).get(pk)
                    if not record:
                        continue
                    if parent and record.parent:
                        parents.add(record.parent)
                    item = {
                        'id': pk,
                        'name': record.name,
                        'slug': record.slug,
                    }
                    objects.append(item if flat else {attr: item})
                data[clear_raw] = objects
                if parent:
                    items = parent(sorted(list(parents), key=lambda x: x.order), many=True).data
                    data['parent_{}'.format(clear_raw)] = [{attr: item} for item in items]
            if clear_raw != raw:
                del data[raw]

    def translate_fields(self, data, instance, *args):
        code = self.context['request'].LANGUAGE_CODE
        default_code = settings.MODELTRANSLATION_DEFAULT_LANGUAGE
        for arg in args:
            data[arg] = getattr(instance, f'{arg}_{code}') or getattr(instance, f'{arg}_{default_code}') or ''

    @staticmethod
    def _get_default_field_kwargs(model, field):
        kwargs = {}
        try:
            field_name = field.model_attr or field.index_fieldname
            model_field = model._meta.get_field(field_name)
            kwargs.update(get_field_kwargs(field_name, model_field))
            delete_attrs = [
                'allow_blank',
                'choices',
                'model_field',
                'allow_unicode',
            ]
            for attr in delete_attrs:
                if attr in kwargs:
                    del kwargs[attr]
        except FieldDoesNotExist:
            pass
        return kwargs


class ReversionMixin:
    create_error = {}

    def create(self, validated_data):
        with reversion.create_revision(), translation.override(settings.MODELTRANSLATION_DEFAULT_LANGUAGE):
            reversion.set_user(self.context['request'].user)
            reversion.set_comment(
                f'Created by {self.context["request"].user.email} (id: {self.context["request"].user.id}).'
            )
            instance = self.perform_create(validated_data)
            self.create_action(instance, validated_data)
            return instance

    def update(self, instance, validated_data):
        with reversion.create_revision(), translation.override(settings.MODELTRANSLATION_DEFAULT_LANGUAGE):
            reversion.set_user(self.context['request'].user)
            reversion.set_comment(
                f'Changed by {self.context["request"].user.email} (id: {self.context["request"].user.id}).'
            )
            instance = self.perform_update(instance, validated_data)
            self.update_action(instance, validated_data)
            return instance

    def perform_create(self, validated_data):
        try:
            return super().create(validated_data)
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
            raise serializers.ValidationError(self.create_error)

    def perform_update(self, instance, validated_data):
        return super().update(instance, validated_data)

    def create_action(self, instance, validated_data):
        pass

    def update_action(self, instance, validated_data):
        pass
