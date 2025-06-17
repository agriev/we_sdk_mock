import abc
import typing

from django.db.models import QuerySet
from rest_framework.authentication import SessionAuthentication
from rest_framework.parsers import BaseParser
from rest_framework.permissions import BasePermission
from rest_framework.renderers import BaseRenderer, BrowsableAPIRenderer
from rest_framework.serializers import BaseSerializer


class BrowsableAPIRendererWithoutForms(BrowsableAPIRenderer):
    """Renders the browsable api, but excludes the forms."""

    def get_context(self, *args, **kwargs):
        ctx = super().get_context(*args, **kwargs)
        ctx['display_edit_forms'] = False
        return ctx

    def show_form_for_method(self, view, method, request, obj):
        """We never want to do this! So just return False."""
        return False

    def get_rendered_html_form(self, data, view, method, request):
        """Why render _any_ forms at all. This method should return
        rendered HTML, so let's simply return an empty string.
        """
        return ""


class BinaryParser(BaseParser):
    media_type = 'application/octet-stream'

    def parse(self, stream, media_type=None, parser_context=None):
        return stream.read()


class BinaryRenderer(BaseRenderer):
    media_type = 'application/octet-stream'
    format = 'bin'
    charset = None
    render_style = 'binary'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


SerializerType = typing.TypeVar('SerializerType', bound=BaseSerializer)


class MultiSerializerViewSetMixin(metaclass=abc.ABCMeta):
    @property
    @abc.abstractmethod
    def serializer_action_classes(self) -> typing.Dict[str, SerializerType]:
        pass

    def get_serializer_class(self):
        """
        Look for serializer class in self.serializer_action_classes, which
        should be a dict mapping action name (key) to serializer class (value),
        i.e.:

        class MyViewSet(MultiSerializerViewSetMixin, ViewSet):
            serializer_class = MyDefaultSerializer
            serializer_action_classes = {
               'list': MyListSerializer,
               'my_action': MyActionSerializer,
            }

            @action
            def my_action:
                ...

        If there's no entry for that action then just fallback to the regular
        get_serializer_class lookup: self.serializer_class, DefaultSerializer.

        """
        try:
            return self.serializer_action_classes[self.action]
        except (KeyError, AttributeError):
            return super(MultiSerializerViewSetMixin, self).get_serializer_class()


PermissionType = typing.TypeVar('PermissionType', bound=BasePermission)


class MultiPermissionsViewSetMixin(metaclass=abc.ABCMeta):
    @property
    @abc.abstractmethod
    def permission_action_classes(self) -> typing.Dict[str, PermissionType]:
        pass

    def get_permissions(self):
        try:
            return [permission() for permission in self.permission_action_classes[self.action]]
        except (KeyError, AttributeError):
            return super(MultiPermissionsViewSetMixin, self).get_permissions()


QuerySetType = typing.TypeVar('QuerySetType', bound=QuerySet)


class MultiQuerysetViewSetMixin(metaclass=abc.ABCMeta):
    @property
    @abc.abstractmethod
    def queryset_actions(self) -> typing.Dict[str, QuerySetType]:
        pass

    def get_queryset(self):
        try:
            queryset = self.queryset_actions[self.action]
            if isinstance(queryset, QuerySet):
                # Ensure queryset is re-evaluated on each request.
                queryset = queryset.all()
            return queryset
        except (KeyError, AttributeError):
            return super(MultiQuerysetViewSetMixin, self).get_queryset()


class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return
