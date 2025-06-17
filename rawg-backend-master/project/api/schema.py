import logging

from django.conf import settings
from django.contrib.auth.decorators import login_required
from drf_yasg import openapi, views
from drf_yasg.generators import OpenAPISchemaGenerator
from drf_yasg.inspectors import SwaggerAutoSchema
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly


class CustomSwaggerAutoSchema(SwaggerAutoSchema):
    def get_view_serializer(self):
        if not hasattr(self.view, 'get_serializer'):
            return None
        try:
            return self.view.get_serializer([], initial={'api-docs': True})
        except Exception:
            logging.getLogger(__name__).warning(
                "view's get_serializer raised exception (%s %s %s)",
                self.method, self.path, type(self.view).__name__, exc_info=True
            )
            return None

    def get_summary_and_description(self):
        _, text = super().get_summary_and_description()
        text = text.replace(
            '](docs/',
            '](https://github.com/behindthegames/rawg/blob/master/docs/'
        )
        return _, text

    def should_filter(self):
        if self.method.lower() == 'delete':
            return False
        return super().should_filter()


def patch_response(func):
    def inner(*args, **kwargs):
        response = func(*args, **kwargs)
        if response.has_header('Vary'):
            delimiter = ', '
            response['Vary'] = delimiter.join([
                header for header in response['Vary'].split(delimiter) if header != 'Authorization'
            ])
        return response

    return inner


description = '''
[How to use it?](https://3.basecamp.com/3964781/buckets/8139386/documents/1216242629)
'''


def view(name):
    cache_timeout = 0
    if not settings.DEBUG:
        cache_timeout = 600
    schema_view = views.get_schema_view(
        openapi.Info(
            title='AG Website API',
            default_version='beta',
            description=description,
        ),
        public=True,
        permission_classes=(AllowAny,),
    )
    return login_required(
        patch_response(schema_view.with_ui(name, cache_timeout=cache_timeout)),
        login_url='/houston/login/'
    )


class DocumentationCustomSwaggerAutoSchema(CustomSwaggerAutoSchema):
    def get_summary_and_description(self):
        _, text = super().get_summary_and_description()
        text = text.replace(
            '](https://github.com/behindthegames/rawg/blob/master/docs/',
            '](https://api.ag.ru/documentation/descriptions/'
        )
        return _, text


class DocumentationOpenAPISchemaGenerator(OpenAPISchemaGenerator):
    include = [
        'creators',
        'creator-roles',
        'developers',
        'games',
        'genres',
        'platforms',
        'publishers',
        'stores',
        'tags',
    ]

    def get_endpoints(self, request):
        endpoints = super().get_endpoints(request)
        filtered = {}
        for key, value in endpoints.items():
            key = self.filter_endpoint(key, value[0])
            if not key:
                continue
            filtered[key] = value
        return filtered

    def filter_endpoint(self, endpoint, endpoint_view):
        start = endpoint.replace('/api/', '').split('/').pop(0)
        if start not in self.include:
            return False
        if hasattr(endpoint_view, 'filter_open_endpoints') and not endpoint_view.filter_open_endpoints(endpoint):
            return False
        return endpoint

    def get_security_definitions(self):
        return {}

    def get_operation(self, view, path, prefix, method, components, request):
        view.swagger_schema = DocumentationCustomSwaggerAutoSchema
        return super().get_operation(view, path, prefix, method, components, request)


documentation_description = '''
The largest open video games database.

### Why build on AG
- More than 350,000 games for 50 platforms including mobiles.
- Rich metadata: tags, genres, developers, publishers, individual creators, official websites, release dates,
Metacritic ratings.
- Where to buy: links to digital distribution services
- Similar games based on visual similarity.
- Player activity data: Steam average playtime and AG player counts and ratings.
- Actively developing and constantly getting better by user contribution and our algorithms.

### Terms of Use
- Free for personal use as long as you attribute AG as the source of the data and/or images and add an active
hyperlink from every page where the data of AG is used.
- Free for commercial use for startups and hobby projects with not more than 100,000 monthly active users or 500,000
page views per month. If your project is larger than that, email us at [feedback@kanobu.ru](mailto:feedback@kanobu.ru) for
commercial terms.
- No cloning. It would not be cool if you used our API to launch a clone of AG. We know it is not always easy
to say what is a duplicate and what isn't. Drop us a line at [api@ag.ru](mailto:api@ag.ru) if you are in doubt,
and we will talk it through.
- You must include an API key with every request. The key can be obtained at https://ag.ru/apidocs.
If you don’t provide it, we may ban your requests.

__[Read more](https://ag.ru/apidocs)__.
'''


def custom_manual_fields():
    # https://github.com/axnsan12/drf-yasg/issues/291

    from drf_yasg.openapi import SchemaRef

    def recursive_merge(schema, override_schema):
        for attr, val in override_schema.items():
            schema_val = schema.get(attr, None)

            if isinstance(schema_val, SchemaRef):
                # Can't merge SchemaRef with dict, replace the whole object
                schema[attr] = val
            elif isinstance(val, dict):
                if schema_val:
                    recursive_merge(schema_val, val)
                else:
                    schema[attr] = val
            else:
                schema[attr] = val

    def add_manual_fields(self, serializer_or_field, schema):
        meta = getattr(serializer_or_field, "Meta", None)
        swagger_schema_fields = getattr(meta, "swagger_schema_fields", {})
        if swagger_schema_fields:
            recursive_merge(schema, swagger_schema_fields)

    from drf_yasg.inspectors import (
        CamelCaseJSONFilter, RecursiveFieldInspector, ReferencingSerializerInspector, ChoiceFieldInspector,
        FileFieldInspector, DictFieldInspector, HiddenFieldInspector, RelatedFieldInspector,
        SerializerMethodFieldInspector, SimpleFieldInspector, StringDefaultFieldInspector
    )
    CamelCaseJSONFilter.add_manual_fields = add_manual_fields
    RecursiveFieldInspector.add_manual_fields = add_manual_fields
    ReferencingSerializerInspector.add_manual_fields = add_manual_fields
    ChoiceFieldInspector.add_manual_fields = add_manual_fields
    FileFieldInspector.add_manual_fields = add_manual_fields
    DictFieldInspector.add_manual_fields = add_manual_fields
    HiddenFieldInspector.add_manual_fields = add_manual_fields
    RelatedFieldInspector.add_manual_fields = add_manual_fields
    SerializerMethodFieldInspector.add_manual_fields = add_manual_fields
    SimpleFieldInspector.add_manual_fields = add_manual_fields
    StringDefaultFieldInspector.add_manual_fields = add_manual_fields


def documentation_view():
    custom_manual_fields()

    cache_timeout = 0
    if not settings.DEBUG:
        cache_timeout = 3600
    schema_view = views.get_schema_view(
        openapi.Info(
            title='AG Video Games Database API',
            default_version='v1.0',
            description=documentation_description,
        ),
        public=False,
        permission_classes=(IsAuthenticatedOrReadOnly,),
        authentication_classes=(),
        generator_class=DocumentationOpenAPISchemaGenerator,
    )
    return patch_response(schema_view.with_ui('redoc', cache_timeout=cache_timeout))
