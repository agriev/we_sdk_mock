import abc
import typing

from rest_framework import serializers
from rest_framework.fields import empty


class AbstractSerializerMetaclass(serializers.SerializerMetaclass, abc.ABCMeta):
    pass


class AbstractWebhookSerializer(serializers.Serializer, metaclass=AbstractSerializerMetaclass):
    determinative_field = None

    @classmethod
    def _get_class_field(cls, name: str) -> serializers.Field:
        return cls._declared_fields[name]

    @classmethod
    def can_process_data(cls, data: dict) -> bool:
        try:
            cls._get_class_field(cls.determinative_field).run_validation(data.get(cls.determinative_field, empty))
        except serializers.ValidationError:
            return False
        return True

    def create(self, validated_data):
        """noop by default"""
        return True

    def update(self, instance, validated_data):
        """noop by default"""
        return True


WebhookSerializerType = typing.TypeVar('WebhookSerializerType', bound=AbstractWebhookSerializer)


class MultiSerializersByDataMixin(abc.ABC):
    @property
    @abc.abstractmethod
    def serializer_classes(self): ...

    def get_serializer(self, data: dict) -> WebhookSerializerType:
        serializer_class = self.get_serializer_class(data=data)
        return serializer_class(
            data=data,
            context={
                'request': self.request,
                'format': self.format_kwarg,
                'view': self
            }
        )

    def get_serializer_class(self, data: dict) -> typing.Type[WebhookSerializerType]:
        try:
            return next(s_class for s_class in self.serializer_classes if s_class.can_process_data(data))
        except StopIteration:
            raise NotImplementedError('No serializer can process this message')
