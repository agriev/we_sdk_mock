import json
from datetime import datetime
from urllib.parse import urlencode

import scrapy
from crawlers.utils.clear import check, clear_name, clear_url
from crawlers.utils.release_date_mixin import ReleaseDateMixin


class NintendoSpider(ReleaseDateMixin, scrapy.Spider):
    db = None
    only_new = False
    collection = 'nintendo'
    name = 'nintendo'
    store_url = 'https://www.nintendo.com/games/detail/{}/'
    cookies = {'esrb.verified': 'true'}
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:70.0) Gecko/20100101 Firefox/70.0',
        'Origin': 'https://www.nintendo.com',
    }
    api_url = 'https://u3b6gr4ua3-dsn.algolia.net/1/indexes/*/queries?'
    params = {
        "x-algolia-agent": "Algolia for vanilla JavaScript (lite) 3.22.1;JS Helper 2.20.1",
        "x-algolia-application-id": "U3B6GR4UA3",
        "x-algolia-api-key": "9a20c93440cf63cf1a7008d75f7438bf"
    }
    data = {"requests": [{
        "indexName": "noa_aem_game_en_us",
        "params":
            "query=&hitsPerPage=42&maxValuesPerFacet=30&page=1&facets=%5B%22generalFilters%22%2C%22platform%22%2C%22"
            "availability%22%2C%22categories%22%2C%22filterShops%22%2C%22virtualConsole%22%2C%22characters%22%2C%22"
            "priceRange%22%2C%22esrb%22%2C%22filterPlayers%22%5D&tagFilters="
    }]}

    def start_requests(self):
        yield scrapy.Request(
            self.api_url + urlencode(self.params),
            method='POST',
            body=json.dumps(self.data),
            headers=self.headers,
            callback=self.parse
        )

    def parse(self, response):
        data = json.loads(response.text)['results'][0]
        for application in data['hits']:
            if (
                application['type'] != 'game'
                or 'available now' not in map(str.lower, application.get('availability', []))
            ):
                continue
            application_id = application['objectID']
            if self.only_new and self.db.find({'id': application_id}).count():
                continue
            yield scrapy.Request(
                self.store_url.format(application['slug']),
                cookies=self.cookies,
                headers=self.headers,
                callback=self.parse_game,
                meta={'item': application},
            )
        if data['nbPages'] == data['page'] or not data['nbPages']:
            return
        self.data['requests'][0]['params'] = self.data['requests'][0]['params'].replace(
            f'&page={data["page"]}&',
            f'&page={data["page"] + 1}&'
        )
        yield scrapy.Request(
            self.api_url + urlencode(self.params),
            method='POST',
            body=json.dumps(self.data),
            headers=self.headers,
            callback=self.parse
        )

    def parse_game(self, response):
        list_item = response.meta['item']
        name = clear_name(list_item.get('title'), self.collection)
        if not check(name, self.collection):
            return
        release_date = self.date(list_item.get('releaseDateMask'))
        return {
            'name': name,
            'release_date': self.get_release_date(release_date) if release_date else None,
            'platforms':
                {self.platform(list_item['platform']): {'requirements': {}}} if list_item.get('platform') else {},
            'required_age': list_item.get('esrb'),
            'developers': [d.strip() for d in list_item.get('developers', []) if d],
            'publishers': [d.strip() for d in list_item.get('publishers', []) if d],
            'website': response.css('a[itemprop="URL sameAs"]::attr(href)').extract_first(),
            'screenshots': [
                self.screenshot(s) for s
                in response.css('.carousel-viewport .items .item img::attr(data-src)').extract()
            ],
            'description': list_item.get('description'),
            'categories': [d.strip() for d in list_item.get('categories', []) if d],
            'url': clear_url(self.store_url.format(list_item.get('slug')), self.collection),
            'id': list_item['objectID'],
        }

    @staticmethod
    def date(date):
        try:
            return datetime.strptime(date.split('T').pop(0), '%Y-%m-%d').isoformat()
        except ValueError:
            return None

    @staticmethod
    def platform(raw):
        platform = raw.strip().replace(' ', '-').lower().replace('/android', '')
        if platform == 'new-nintendo-3ds-systems-only':
            return 'nintendo-3ds'
        if platform == 'mac':
            return 'macos'
        return platform

    @staticmethod
    def screenshot(raw):
        return 'https://www.nintendo.com{}'.format(raw)
