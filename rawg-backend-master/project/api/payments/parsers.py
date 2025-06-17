from logging import getLogger

from django.conf import settings
from rest_framework.exceptions import ParseError
from rest_framework.parsers import JSONParser
from rest_framework.utils import json


logger = getLogger(__name__)


class JSONRawBodyParser(JSONParser):
    """Preserves request body as bytes at `request.raw_body`"""
    def parse(self, stream, media_type=None, parser_context=None):
        parser_context = parser_context or {}
        encoding = parser_context.get('encoding', settings.DEFAULT_CHARSET)
        request = parser_context.get('request')
        try:
            request_body: bytes = stream.read()  #  codecs.getreader(encoding)(stream).read()
            setattr(request, 'raw_body', request_body)
            parse_constant = json.strict_constant if self.strict else None
            return json.loads(request_body.decode(encoding), parse_constant=parse_constant)
        except ValueError as e:
            raise ParseError(f'JSON parse error - {str(e)}')
