"""
Information
http://gogapidocs.readthedocs.io/en/latest/galaxy.html
"""

import json
from datetime import datetime

import requests
import scrapy
from crawlers.utils.clear import check, clear_name, clear_url
from django.template.defaultfilters import linebreaksbr


class GogSpider(scrapy.Spider):
    db = None
    only_new = False
    collection = 'gog'
    name = 'gog'

    start_url = 'https://www.gog.com/games/ajax/filtered?mediaType=game&sort=date&page={}'
    start_urls = [start_url.format(1)]
    api_url = 'https://api.gog.com/products/{}?expand=' \
              'downloads,expanded_dlcs,description,screenshots,videos,related_products,changelog'

    def parse(self, response):
        response = json.loads(response.text)
        for item in response['products']:
            application_id = int(item['id'])
            if self.only_new and self.db.find({'id': application_id}).count():
                continue
            yield scrapy.Request(
                self.api_url.format(application_id) + '&locale=en',
                callback=self.parse_game,
                meta={'item': item}
            )
        page = int(response['page'])
        if page < int(response['totalPages']):
            yield scrapy.Request(self.start_url.format(page + 1), callback=self.parse)

    def parse_game(self, response):
        list_item = response.meta['item']
        data = json.loads(response.text)

        name = clear_name(data.get('title'), self.collection)
        if data['game_type'] not in ('game', 'pack') or not check(name, self.collection):
            return

        description = data.get('description') or {}
        description = (description.get('full') or '') + (description.get('whats_cool_about_it') or '')

        data_ru = requests.get(self.api_url.format(data['id']) + '&locale=ru').json()
        name_ru = clear_name(data_ru.get('title'), self.collection)
        if name_ru == name:
            name_ru = ''
        description_ru = data_ru.get('description') or {}
        description_ru = (description_ru.get('full') or '') + (description_ru.get('whats_cool_about_it') or '')
        if description_ru == description:
            description_ru = ''

        developers_delimiter = self.delimiter(list_item.get('developer'))
        publishers_delimiter = self.delimiter(list_item.get('publisher'))
        item = {
            'name': name,
            'name_lower': name.lower(),
            'name_ru': name_ru,
            'release_date': self.date(list_item.get('releaseDate')),
            'platforms': {},
            'developers': [d.strip() for d in list_item.get('developer').split(developers_delimiter)],
            'publishers': [d.strip() for d in list_item.get('publisher').split(publishers_delimiter)],
            'screenshots': [self.image(s) for s in data.get('screenshots') or {}],
            'description': description,
            'description_ru': description_ru,
            'categories': [list_item.get('originalCategory')],
            'url': clear_url((data.get('links') or {}).get('product_card'), self.collection),
            'id': int(data['id']),
            'language_ru': 1,
        }
        for platform, v in list_item.get('worksOn').items():
            if not v:
                continue
            platform = platform.lower()
            if platform == 'windows':
                platform = 'pc'
            if platform == 'mac':
                platform = 'macos'
            if v:
                item['platforms'][platform] = {'requirements': {}}
        yield scrapy.Request(
            item['url'].replace('http:', 'https:'),
            callback=self.parse_additional_info,
            meta={'item': item}
        )

    def parse_additional_info(self, response):
        item = response.meta['item']
        genres = response.xpath('//div[text()="Genre:"]/following-sibling::div//a/text()')
        if genres:
            item['genres'] = [genre.extract().strip() for genre in genres]
        tags = response.xpath('//div[text()="Features:"]/following-sibling::div//a/text()')
        if tags:
            item['tags'] = [tag.extract().strip() for tag in tags]
        required_age = response.xpath('//div[text()="Rating:"]/following-sibling::dd/span/text()')
        if required_age:
            item['required_age'] = ', '.join([age.extract().strip() for age in required_age])
        requirements = response.css('.sysreq > div')
        if requirements:
            for row in requirements:
                for line in row.css('p'):
                    header = line.xpath('span/text()').extract_first()
                    platform = self.platform(header)
                    requirements = self.requirements(header)
                    if platform and requirements:
                        html = linebreaksbr(''.join(line.xpath('text()').extract()).strip())
                        if not item['platforms'].get(platform):
                            item['platforms'][platform] = {'requirements': {}}
                        item['platforms'][platform]['requirements'][requirements] = html
        yield item

    @staticmethod
    def date(date):
        try:
            return datetime.fromtimestamp(date).isoformat()
        except TypeError:
            return None

    @staticmethod
    def delimiter(item):
        if '/' in item:
            return '/'
        if '&' in item:
            return '&'
        return ','

    @staticmethod
    def image(item):
        return item['formatter_template_url'].replace('_{formatter}', '')

    @staticmethod
    def platform(header):
        header = header.lower()
        if 'windows' in header:
            return 'pc'
        if 'linux' in header:
            return 'linux'
        if 'mac' in header:
            return 'macos'
        return False

    @staticmethod
    def requirements(header):
        header = header.lower()
        if 'recommended' in header:
            return 'recommended'
        return 'minimum'
