import logging
import typing

import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from requests.auth import HTTPBasicAuth
from requests.exceptions import HTTPError
from requests.models import Response

from apps.payments.models import Payment, PaymentProject

logger = logging.getLogger('commands')


class Command(BaseCommand):
    URL = 'https://api.xsolla.com/merchant/v2/projects/{project_id}/is_external_id_required'
    EXPECTED_STATUS_CODE = 204

    def add_arguments(self, parser):
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument('--enable', action='store_true')
        group.add_argument('--disable', action='store_true')
        parser.add_argument('--ids', required=False, nargs='*', type=int, default=list())

    def handle(self, *args, **kwargs):
        import time
        start = time.time()
        for project in self.get_projects(**kwargs):
            try:
                response = self.request(project, kwargs['enable'])
                if response.status_code != self.EXPECTED_STATUS_CODE:
                    logger.warning(f'Xsolla replied with an unexpected status. ID: {project.id}')
                else:
                    logger.info(f'Xsolla flag is_external_id_required changed to {kwargs["enable"]}. ID: {project.id}')
            except HTTPError:
                logging.error(f'Can\'t change flag is_external_id_required for xsolla project. ID: "{project.id}"')
        print(time.time() - start)

    def get_projects(self, **kwargs) -> typing.Iterable[PaymentProject]:
        projects = PaymentProject.objects.filter(payment_system_name=Payment.XSOLLA)
        if kwargs['ids']:
            projects = projects.filter(id__in=kwargs['ids'])
        return projects

    def request(self, project: PaymentProject, enable: bool) -> Response:
        url = self.URL.format(project_id=project.id)
        auth = HTTPBasicAuth(settings.XSOLLA_MERCHANT_ID, settings.XSOLLA_API_KEY)
        data = {'is_external_id_required': enable}
        response = requests.put(url, auth=auth, json=data)
        response.raise_for_status()
        return response
