import math
from datetime import datetime

import requests
import scrapy
from crawlers.utils.clear import check, clear_name, clear_url


class Xbox360Spider(scrapy.Spider):
    db = None
    only_new = False
    collection = 'xbox360'
    name = 'xbox360'
    base_url = 'https://marketplace.xbox.com'
    start_url = f'{base_url}/en-US/Games?PageSize=90&Page={{}}'
    headers_ru = {
        'Accept-Language': 'ru;q=0.8,en-US;q=0.5,en;q=0.3'
    }

    def __init__(self, **kwargs):
        self.start_urls = []
        url = self.start_url.format(1)
        response = requests.get(url)
        response = scrapy.http.TextResponse(url=response.url, body=response.text, encoding='utf-8')
        select = response.css('.Paging .Coverage::text')
        if select:
            pages_string = select.pop().extract()
            page_size_string, pages_string = pages_string.split('of')
            page_size = int(page_size_string.strip().split('-').pop())
            pages = int(math.ceil(int(pages_string.strip().replace(',', '').split(' ')[0]) / page_size))
            for page in range(1, pages + 1):
                self.start_urls.append(self.start_url.format(page))
        else:
            self.start_urls.append(url)
        super().__init__(**kwargs)

    def parse(self, response):
        applications = response.css('.ProductResults > li')
        for application in applications:
            url = self.base_url + application.css('a::attr(href)').extract_first()
            application_id = url.split('/').pop()
            if self.only_new and self.db.find({'id': application_id}).count():
                continue
            yield scrapy.Request(url, callback=self.parse_game, meta={'application_id': application_id})

    def parse_game(self, response):
        name = clear_name(response.css('h1::text').extract_first(), self.collection)
        if not check(name, self.collection):
            return

        genres = self.prepare(response.xpath('//label[text()="Genre:"]/../text()'))
        genres = [g.strip() for g in genres.split(self.delimiter(genres))]
        if genres == ['Other'] or 'Avatar' in genres:
            return

        release_date = self.prepare(response.xpath('//label[text()="Original release date:"]/../text()'))
        required_age = response.css('#ActualRating::text').extract()
        developers = self.prepare(response.xpath('//label[text()="Developer:"]/../text()'))
        publishers = self.prepare(response.xpath('//label[text()="Publisher:"]/../text()'))

        item = {
            'name': name,
            'name_lower': name.lower(),
            'name_ru': '',
            'genres': genres,
            'release_date': self.date(release_date),
            'platforms': {
                'xbox360': {
                    'requirements': {}
                }
            },
            'required_age': required_age.pop().strip() if required_age else '',
            'developers': [d.strip() for d in developers.split(self.delimiter(developers))],
            'publishers': [p.strip() for p in publishers.split(self.delimiter(publishers))],
            'screenshots': [s for s in response.css('#MediaControl .image img::attr(src)').extract()],
            'description': response.css('#overview1 .Text p::text').extract_first(),
            'description_ru': '',
            'url': clear_url(response.url, self.collection),
            'id': response.meta['application_id'],
            'language_ru': 1,
        }
        yield scrapy.Request(
            item['url'].lower().replace('/en-us/', '/ru-ru/'),
            callback=self.parse_game_ru,
            errback=lambda x: item,
            meta={'item': item},
            headers=self.headers_ru,
        )

    def parse_game_ru(self, response):
        item = response.meta['item']
        name_ru = clear_name(response.css('h1::text').extract_first(), self.collection)
        if name_ru != item['name']:
            item['name_ru'] = name_ru
        description_ru = response.css('#overview1 .Text p::text').extract_first()
        if description_ru != item['description']:
            item['description_ru'] = description_ru
        return item

    @staticmethod
    def prepare(raw):
        item = raw.extract_first()
        if not item:
            return ''
        return item.split(':').pop().strip()

    @staticmethod
    def date(date):
        try:
            return datetime.strptime(date, '%m/%d/%Y').isoformat()
        except ValueError:
            return None

    @staticmethod
    def delimiter(item):
        if ',' in item:
            return ','
        if '/' in item:
            return '/'
        return '&'
