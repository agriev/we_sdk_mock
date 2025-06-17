from ipaddress import ip_address, ip_network
from logging import getLogger

from rest_framework.permissions import BasePermission

logger = getLogger(__name__)


class IpPermission(BasePermission):
    SAFE_NETS = ()
    PREFIX = ''

    def __init__(self, *args, **kwargs):
        self._safe_nets = tuple(map(ip_network, self.SAFE_NETS))
        super().__init__(*args, **kwargs)

    def has_permission(self, request, view) -> bool:
        ip_str = self._get_remote_ip(request)
        try:
            _ip_address = ip_address(ip_str)
        except ValueError:
            logger.error(self._get_err_message(f'invalid remote IP "{ip_str}"'))
            return False
        if any(_ip_address in _safe_net for _safe_net in self._safe_nets):
            return True
        logger.error(self._get_err_message(f'remote IP "{_ip_address}" not in safe nets'))
        return False

    @staticmethod
    def _get_remote_ip(request) -> str:
        try:
            return request.META['HTTP_X_FORWARDED_FOR'].split(',')[-1].strip()
        except KeyError:
            return request.META.get('REMOTE_ADDR')

    def _get_err_message(self, message):
        chunks = filter(lambda _: _, [self.PREFIX, message])
        return ' '.join(chunks).capitalize()


class XsollaIpPermission(IpPermission):
    SAFE_NETS = ('185.30.20.0/24', '185.30.21.0/24', '185.30.23.0/24')
    PREFIX = 'xsolla'


class UkassaIpPermission(IpPermission):
    SAFE_NETS = (
        '185.71.76.0/27', '185.71.77.0/27', '77.75.153.0/25', '77.75.156.11', '77.75.156.35', '77.75.154.128/25',
        '2a02:5180::/32'
    )
    PREFIX = 'ukassa'
