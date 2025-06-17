from django.core.paginator import InvalidPage
from rest_framework.exceptions import NotFound
from rest_framework.pagination import PageNumberPagination


class JSONPageNumberPagination(PageNumberPagination):
    def get_next_link(self):
        if not self.page.has_next():
            return None
        request_data = self.request.data.copy()
        request_data[self.page_query_param] = self.page.next_page_number()
        return request_data

    def get_previous_link(self):
        if not self.page.has_previous():
            return None
        request_data = self.request.data.copy()
        page_number = self.page.previous_page_number()
        if page_number == 1:
            del request_data[self.page_query_param]
        else:
            request_data[self.page_query_param] = page_number
        return request_data

    def paginate_queryset(self, queryset, request, view=None):
        page_size = self.get_page_size(request)
        if not page_size:
            return None
        paginator = self.django_paginator_class(queryset, page_size)
        page_number = request.data.get(self.page_query_param, 1)
        if page_number in self.last_page_strings:
            page_number = paginator.num_pages
        try:
            self.page = paginator.page(page_number)
        except InvalidPage as exc:
            msg = self.invalid_page_message.format(
                page_number=page_number, message=str(exc)
            )
            raise NotFound(msg)
        if paginator.num_pages > 1 and self.template is not None:
            # The browsable API should display pagination controls.
            self.display_page_controls = True
        self.request = request
        return list(self.page)

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'count': {
                    'type': 'integer',
                    'example': 123,
                },
                'next': {
                    'type': 'object',
                    'required': ['app_id'],
                    'properties': {
                        'app_id': {
                            'type': 'integer',
                            'example': 123,
                        },
                        'player_id': {
                            'type': 'string',
                            'example': '586ba8f7ca864c05b30a0110666038bf',
                        },
                        'game_sid': {
                            'type': 'string',
                            'example': '586ba8f7ca864c05b30a0110666038bf',
                        },
                        'transaction_id': {
                            'type': 'integer',
                            'example': 123,
                        },
                        'state': {
                            'type': 'string',
                            'example': '586ba8f7ca864c05b30a0110666038bf',
                        },
                        'page': {
                            'type': 'integer',
                            'example': 123,
                        }
                    },
                    'nullable': True,
                },
                'previous': {
                    'type': 'object',
                    'required': ['app_id'],
                    'properties': {
                        'app_id': {
                            'type': 'integer',
                            'example': 123,
                        },
                        'player_id': {
                            'type': 'string',
                            'example': '586ba8f7ca864c05b30a0110666038bf',
                        },
                        'game_sid': {
                            'type': 'string',
                            'example': '586ba8f7ca864c05b30a0110666038bf',
                        },
                        'transaction_id': {
                            'type': 'integer',
                            'example': 123,
                        },
                        'state': {
                            'type': 'string',
                            'example': '586ba8f7ca864c05b30a0110666038bf',
                        },
                        'page': {
                            'type': 'integer',
                            'example': 123,
                        }
                    },
                    'nullable': True,
                },
                'results': schema,
            },
        }

