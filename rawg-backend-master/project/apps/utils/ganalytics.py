# https://github.com/xoxzo/xoxzo.galib/blob/master/xoxzo/galib/ganalytics.py

import uuid

import requests

from apps.utils.lang import get_lang

GA_ENDPOINT = 'https://www.google-analytics.com/collect'
GA_DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/collect'


class HitClient:
    _VERSION = 1

    def __init__(self, property_id, uip=None, ua=None, al=None, cid=None, cd1=None, debug=False):
        if debug:
            self._debug_flag = True
        else:
            self._debug_flag = False

        self._PID = property_id

        self._common_data = {
            'v': self._VERSION,
            'tid': self._PID,
        }
        if uip:
            self._common_data['uip'] = uip
        if ua:
            self._common_data['ua'] = ua
        if cid:
            self._common_data['cid'] = cid
        if cd1:
            self._common_data['cd1'] = cd1
        ul = get_lang(al)
        if ul:
            self._common_data['ul'] = ul

    def _get_unique_id(self):
        return str(uuid.uuid4())

    def _generate_event_hit_data(
            self,
            event_category,
            event_action,
            user_id=None,
            event_label=None,
            event_value=None
    ):
        # v=1              // Version.
        # &tid=UA-XXXXX-Y  // Tracking ID / Property ID.
        # &cid=555         // Anonymous Client ID.
        # &t=event         // Event hit type
        # &ec=video        // Event Category. Required.
        # &ea=play         // Event Action. Required.
        # &el=holiday      // Event label.
        # &ev=300          // Event value (MUST be an integer)

        hit_data = {'t': 'event', 'ec': event_category, 'ea': event_action}
        if event_label:
            hit_data['el'] = event_label
        if event_value:
            hit_data['ev'] = int(event_value)

        if user_id:
            hit_data['uid'] = user_id
        else:
            hit_data['cid'] = self._get_unique_id()

        # Include common data into the request data
        hit_data.update(self._common_data)
        return hit_data

    def _generate_transaction_hit_data(
            self,
            revenue,
            currency,
            user_id=None,
            shipping=None,
            tax=None,
            affiliation=None,
            transaction_id=None,
    ):
        """
        Returns the hit data to be sent, and also a unique transaction id
        which can be used for individual items which you want to send along to
        tie with this transaction

        - currency are 3 letter ISO 4217 currency codes, like JPY, USD or EUR
        - affiliations can be store names or categories like Books or Electronics.
        """
        # v=1               // Version.
        # &tid=UA-XXXXX-Y   // Tracking ID / Property ID.
        # &cid=555          // Anonymous Client ID.
        # &t=transaction    // Transaction hit type.
        # &ti=12345         // transaction ID. Required.
        # &ta=westernWear   // Transaction affiliation.
        # &tr=50.00         // Transaction revenue.
        # &ts=32.00         // Transaction shipping.
        # &tt=12.00         // Transaction tax.
        # &cu=EUR           // Currency code.

        hit_data = {'t': 'transaction', 'tr': str(revenue), 'cu': currency}

        if tax:
            hit_data['tt'] = str(tax)
        if shipping:
            hit_data['ts'] = str(shipping)
        if affiliation:
            hit_data['ta'] = affiliation

        if user_id:
            hit_data['uid'] = user_id
        else:
            hit_data['cid'] = self._get_unique_id()

        if transaction_id:
            hit_data['ti'] = transaction_id
        else:
            hit_data['ti'] = self._get_unique_id().replace('-', '')

        hit_data.update(self._common_data)
        return hit_data

    def send_hit(self, hit_type, **kwargs):
        """
        The type of hit. Must be one of 'pageview', 'screenview', 'event',
        'transaction', 'item', 'social', 'exception', 'timing'.
        If you send a 'transaction' type hit, you'll be returned a transaction
        id which you can use to tie 'item' type hits later on.
        https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#t
        """

        method_name = '_generate_%s_hit_data' % (hit_type.lower().strip())
        if not hasattr(self, method_name):
            raise NotImplementedError

        processor = getattr(self, method_name)

        hit_payload = None
        if hit_type == 'transaction':
            hit_payload = processor(
                kwargs['revenue'],
                kwargs['currency'],
                user_id=kwargs.get('user_id', None),
                shipping=kwargs.get('shipping', None),
                tax=kwargs.get('tax', None),
                affiliation=kwargs.get('affiliation', None),
                transaction_id=kwargs.get('transaction_id', None),
            )
        if hit_type == 'event':
            hit_payload = processor(
                kwargs['event_category'],
                kwargs['event_action'],
                user_id=kwargs.get('user_id', None),
                event_label=kwargs.get('event_label', None),
                event_value=kwargs.get('event_value', None),
            )
        if self._debug_flag:
            r = requests.post(GA_DEBUG_ENDPOINT, data=hit_payload)
            r.raise_for_status()
            return r.json()
        else:
            r = requests.post(GA_ENDPOINT, data=hit_payload)

        r.raise_for_status()

        if hit_type == 'transaction':
            return hit_payload['ti']


def get_cid_from_cookie(ga):
    return '.'.join((ga or '').split('.')[-2:])
