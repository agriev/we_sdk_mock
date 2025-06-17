from django.conf import settings
from sentry_sdk import capture_exception as default_capture_exception


class Found(Exception):
    pass


def capture_exception(e, exclude=None, raise_on_debug=True, raise_on_tests=True):
    if settings.IS_SENTRY:
        if exclude and type(e) is exclude:
            return
        try:
            raise e
        except Exception as e:
            default_capture_exception(e)
    elif (raise_on_debug and settings.DEBUG) or (raise_on_tests and settings.ENVIRONMENT == 'TESTS'):
        raise e
