from time import sleep

import feedparser
from constance import config
from django.conf import settings
from django.utils.timezone import now

from apps.utils.cache import Job
from apps.utils.exceptions import capture_exception


class MediumException(Exception):
    def __init__(self, message):
        self.message = message


class BannersMedium(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch_feed(self, retry=True):
        if config.NEWS_TITLE and config.NEWS_LINK and config.NEWS_DATE:
            return {
                'title': config.NEWS_TITLE,
                'link': config.NEWS_LINK,
                'date': config.NEWS_DATE,
            }
        feed = feedparser.parse(settings.MEDIUM_FEED)
        if not feed.entries:
            if retry:
                sleep(10)
                return self.fetch_feed(False)
            raise MediumException('Medium error: {}'.format(feed))
        return {
            'title': feed.entries[0].title,
            'link': feed.entries[0].link,
            'date': feed.entries[0].date,
        }

    def fetch(self):
        try:
            return self.fetch_feed()
        except Exception as e:
            capture_exception(e, raise_on_tests=False)
            return {
                'title': 'Medium',
                'link': settings.MEDIUM_FEED,
                'date': now(),
            }
