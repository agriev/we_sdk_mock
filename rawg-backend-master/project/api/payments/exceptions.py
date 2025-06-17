import abc

from rest_framework import status
from rest_framework.exceptions import APIException


class WebhookException(Exception, metaclass=abc.ABCMeta):
    code = 'INVALID_CODE'
    message = 'Invalid message'


class InvalidProjectError(WebhookException):
    code = 'INVALID_PROJECT'
    message = 'Invalid project'


class InvalidUserError(WebhookException):
    code = 'INVALID_USER'
    message = 'Invalid user'


class InvalidParameterError(WebhookException):
    code = 'INVALID_PARAMETER'
    message = 'Invalid parameter'


class InvalidSignatureError(WebhookException):
    code = 'INVALID_SIGNATURE'
    message = 'Invalid signature'


class IncorrectAmountError(WebhookException):
    code = 'INCORRECT_AMOUNT'
    message = 'Incorrect amount'


class InvalidJSONError(WebhookException):
    code = 'INVALID_JSON'
    message = 'Invalid JSON'


class ServiceUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Payment services unavailable now'
