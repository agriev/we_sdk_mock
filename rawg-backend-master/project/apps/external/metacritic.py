from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

from apps.utils.api import int_or_number


class MetacriticParser(object):
    """Metacritic parser class"""
    def __init__(self):
        self.base_url = 'https://www.metacritic.com{}'
        self.netloc = 'www.metacritic.com'
        self.platform_urls = []
        self.metascore = []

    def _get_headers(self):
        user_agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko)' \
            'Chrome/70.0.3524.0 Safari/537.36'

        headers = {
            'User-Agent': user_agent,
        }
        return headers

    def _is_valid_url(self, url):
        """Checks valid netloc"""
        parsed_url = urlparse(url)
        return parsed_url.netloc == self.netloc

    def get(self, url):
        """Returns html soup of page"""
        if not self._is_valid_url(url):
            return
        response = requests.get(url, headers=self._get_headers())
        if response.status_code != 200:
            return
        return BeautifulSoup(response.content, 'html.parser')

    def _get_platform_title_mapping(self, platform_title):
        """
        Provides dicts with mapping of metacritic platform titles and ag db.

        It can be extended in case the database doesn't contain received platform title.
        """
        platform_title_mapping = {
            'DS': 'Nintendo 3DS',
            '3DS': 'Nintendo 3DS',
            'Switch': 'Nintendo Switch',
            'PlayStation Vita': 'PS Vita',
            'Mobile': 'Android',
            'Xbox Series X': 'Xbox Series S/X',
            'Xbox Series S': 'Xbox Series S/X',
        }
        return platform_title_mapping.get(platform_title, platform_title)

    def _get_platform_title(self, soup):
        """Returns platform title"""
        platform = soup.find('span', class_='platform')
        if not platform:
            return
        current_platform = platform.text
        current_platform = self._get_platform_title_mapping(current_platform.strip())
        return current_platform

    def _gather_platforms(self, soup):
        """Gathers urls for all other platforms available for the current game"""
        platforms_tags = ('li', 'a')
        platforms_tags_class = 'summary_detail product_platforms'
        platforms_links = soup.find(platforms_tags[0], class_=platforms_tags_class)
        if not hasattr(platforms_links, 'find_all'):
            return
        platforms_link_tags = platforms_links.find_all(platforms_tags[1])
        self.platform_urls = [tag.get('href') for tag in platforms_link_tags]

    def _get_metascore_value(self, soup):
        """Returns int value of metascore"""
        try:
            metascore_block = soup.find('div', class_='metascore_summary').find('span')
        except AttributeError:
            return 0
        if hasattr(metascore_block, 'text'):
            return int_or_number(metascore_block.text)
        return 0

    def get_metascore(self, soup, url):
        """Returns dict of metascore for all games platforms"""
        platform = self._get_platform_title(soup)
        if not platform:
            return self.metascore

        self.metascore.append((
            platform,
            self._get_metascore_value(soup),
            url
        ))

        self._gather_platforms(soup)

        for platform_url in self.platform_urls:
            platform_soup = self.get(self.base_url.format(platform_url))
            if not platform_soup:
                continue
            self.metascore.append((
                self._get_platform_title(platform_soup),
                self._get_metascore_value(platform_soup),
                self.base_url.format(platform_url)
            ))

        return self.metascore
