import json

import requests
import scrapy
from crawlers.utils.clear import check, clear_name, clear_url
from dateutil.parser import parse


class XboxSpider(scrapy.Spider):
    db = None
    only_new = False
    collection = 'xbox'
    name = 'xbox'
    base_url = 'https://www.microsoft.com'
    pages = [
        '/en-us/store/top-paid/games/xbox',
        '/en-us/store/top-free/games/xbox',
        '/en-us/store/new/games/xbox',
        '/en-us/store/coming-soon/games/xbox',
        '/en-us/store/best-rated/games/xbox',
        '/en-us/store/most-played/games/xbox',
    ]
    ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:68.0) Gecko/20100101 Firefox/68.0'
    headers = {
        'User-Agent': ua
    }
    headers_ru = {
        'User-Agent': ua,
        'Accept-Language': 'ru;q=0.8,en-US;q=0.5,en;q=0.3'
    }

    def fetch_pagination_pages_urls(self, scrapy_html_reponse):
        pagination_pages = scrapy_html_reponse.css('.m-pagination li a::attr(href)').extract()
        first_page_url_pagination_index = 1
        last_page_url_pagination_index = len(pagination_pages) - 1
        return pagination_pages[first_page_url_pagination_index:last_page_url_pagination_index]

    def fetch_scrapy_html_response(self, first_page_url):
        response = requests.get(first_page_url, headers=self.headers)
        response = scrapy.http.HtmlResponse(url=response.url, body=response.content, encoding='utf-8')
        return response

    def obtain_release_date(self, response):
        raw_release_date = response.css('#releaseDate-toggle-target span::text').extract_first()
        if raw_release_date:
            return parse(raw_release_date).isoformat()

    def start_requests(self):
        for url in self.pages:
            first_page_url = '{}{}'.format(self.base_url, url)
            scrapy_html_response = self.fetch_scrapy_html_response(first_page_url)
            pagination_pages_urls = self.fetch_pagination_pages_urls(scrapy_html_response)
            yield from self.parse(scrapy_html_response)

            for pagination_url in pagination_pages_urls:
                page_url = '{}{}'.format(self.base_url, pagination_url)
                yield scrapy.Request(url=page_url, callback=self.parse, headers=self.headers)

    def parse(self, response):
        applications = response.css('.m-channel-placement-item')
        for application in applications:
            url = self.base_url + application.css('a::attr(href)').extract_first()
            application_id = url.split('/').pop()
            if self.only_new and self.db.find({'id': application_id}).count():
                continue
            yield scrapy.Request(
                url,
                callback=self.parse_game,
                meta={'application_id': application_id},
                headers=self.headers
            )

    def parse_game(self, response):
        name = clear_name(response.css('h1::text').extract_first(), self.collection)
        if not check(name, self.collection):
            return

        screens = json.loads(response.css('#mediaGalleryOverlay::attr(data-slides-json)').extract_first())
        item = {
            'name': name,
            'name_lower': name.lower(),
            'name_ru': '',
            'release_date': self.obtain_release_date(response),
            'platforms': {
                'xbox-one': {
                    'requirements': {}
                }
            },
            'required_age': response.css('.c-age-rating .c-label a::text').extract_first(),
            'publishers': [response.xpath('//h1/following-sibling::dl/dd/text()').extract_first()],
            'screenshots': ['https:{}'.format(s['DefaultGalleryImageUrl']) for s in screens],
            'description': self.process_description(response.css('#product-description::text').extract_first()),
            'description_ru': '',
            'url': clear_url(response.url, self.collection),
            'id': response.meta['application_id'],
            'language_ru': 1,
        }
        yield scrapy.Request(
            item['url'].replace('/en-us/', '/ru-ru/'),
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
        description_ru = response.css('#product-description::text').extract_first()
        if description_ru != item['description']:
            item['description_ru'] = self.process_description(description_ru)
        return item

    def process_description(self, text):
        if not text:
            return ''
        return text.strip(' \r\n').replace('\r\n\r\n', '<br><br>')
