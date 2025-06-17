from functools import wraps

from django.utils.decorators import available_attrs


def headers(header_map):
    # View decorator that sets multiple response headers.
    #
    # Example:
    # @headers({'Connection': 'close', 'X-Powered-By': 'Django'})
    # def view(request, ...):
    #     ....
    #
    # For class-based views use:
    # @method_decorator(headers({'Connection': 'close', 'X-Powered-By': 'Django'})
    # def get(self, request, ...)
    #     ...
    def decorator(func):
        @wraps(func, assigned=available_attrs(func))
        def inner(request, *args, **kwargs):
            response = func(request, *args, **kwargs)
            for k in header_map:
                response[k] = header_map[k]
            return response
        return inner
    return decorator
