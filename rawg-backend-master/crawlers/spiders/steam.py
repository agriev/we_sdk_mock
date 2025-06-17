"""
Information
https://steamdb.info/blog/store-prices-api/
https://wiki.teamfortress.com/wiki/User:RJackson/StorefrontAPI
http://steamcommunity.com/dev
"""
import calendar
import json
from datetime import datetime, timedelta

import pytz
import scrapy
from crawlers.utils.clear import check, clear_name, clear_url
from django.utils.timezone import now


class SteamSpider(scrapy.Spider):
    db = None
    only_new = False
    only_new_full = False
    collection = 'steam'
    name = 'steam'
    download_delay = 2
    start_url = (
        'https://store.steampowered.com/search/results'
        '?query&start={}&count=50&dynamic_data=&sort_by=Released_DESC&ignore_preferences=1&'
        'category1=998&snr=1_7_7_230_7&infinite=1'
    )
    api_url = 'https://store.steampowered.com/api/appdetails/?appids={}'
    store_url = 'https://store.steampowered.com/app/{}/'
    cookies = {
        'lastagecheckage': '16-January-1970',
        'birthtime': '1285201',
        'mature_content': '1',
        'wants_mature_content': '1',
    }
    headers = {
        'Accept-Language': 'en-US;q=1,en;q=0.8'
    }
    headers_ru = {
        'Accept-Language': 'ru;q=0.8,en-US;q=0.5,en;q=0.3'
    }
    start = 0
    now = now() - timedelta(days=10)

    def start_requests(self):
        yield scrapy.Request(
            self.start_url.format(self.start),
            callback=self.parse,
            headers=self.headers,
        )

    def parse(self, response):
        json_response = json.loads(response.text)
        response = scrapy.http.TextResponse(url=response.url, body=json_response['results_html'], encoding='utf-8')
        for application in response.css('a'):
            date = self.date(
                application.css('.responsive_search_name_combined > .search_released::text').extract_first(),
                is_str=False,
            )
            if self.only_new and not self.only_new_full and date and date < self.now:
                return
            application_id = application.css('::attr(data-ds-appid)').extract_first().split(',').pop(0)
            if self.only_new and self.db.find({'id': int(application_id)}).count():
                continue
            yield scrapy.Request(
                self.api_url.format(application_id),
                callback=self.parse_game,
                headers=self.headers,
            )
        if json_response['total_count'] < self.start + 50:
            return
        self.start += 50
        yield scrapy.Request(
            self.start_url.format(self.start),
            callback=self.parse,
            headers=self.headers,
        )

    def parse_game(self, response):
        json_response = json.loads(response.text)

        try:
            application_id = list(json_response.keys())[0]
        except IndexError:
            return

        if not json_response[application_id].get('success') or json_response[application_id]['data']['type'] != 'game':
            return

        data = json_response[application_id]['data']
        name = clear_name(data.get('name'), self.collection)
        if not check(name, self.collection):
            return

        movies = []
        for movie in data.get('movies') or []:
            links = {}
            for size in movie['webm']:
                url = movie['webm'][size].split('.com/').pop().split('.webm')[0]
                links[size] = 'https://steamcdn-a.akamaihd.net/{}.mp4'.format(url)
            movies.append({
                'id': movie['id'],
                'name': movie['name'],
                'preview': movie['thumbnail'].replace(
                    'http://cdn.akamai.steamstatic.com/',
                    'https://steamcdn-a.akamaihd.net/'
                ),
                'data': links,
            })

        item = {
            'name': name,
            'name_lower': name.lower(),
            'name_ru': '',
            'genres': [g['description'] for g in data.get('genres') or {}],
            'release_date': self.date((data.get('release_date') or {}).get('date', )),
            'platforms': {},
            'required_age': data.get('required_age'),
            'developers': data.get('developers'),
            'publishers': data.get('publishers'),
            'website': data.get('website'),
            'screenshots': [s['path_full'] for s in data.get('screenshots') or {}],
            'movies': movies,
            'description': data.get('detailed_description'),
            'description_ru': '',
            'categories': [c['description'] for c in data.get('categories') or {}],
            'tags': [],
            'metacritic': data.get('metacritic'),
            'url': clear_url(self.store_url.format(data['steam_appid']), self.collection),
            'id': int(application_id),
            'language_ru': 1,
        }
        for platform, v in data.get('platforms').items():
            if platform == 'windows':
                platform = 'pc'
            if v:
                platform_name = platform
                if platform == 'mac':
                    platform_name = 'macos'
                item['platforms'][platform_name] = {
                    'requirements': data.get(f'{platform}_requirements'),
                }
        yield scrapy.Request(
            item['url'],
            callback=self.parse_additional_info,
            meta={'item': item},
            cookies=self.cookies
        )

    def parse_additional_info(self, response):
        item = response.meta['item']
        tags = response.css('.glance_tags.popular_tags > a')
        if tags:
            item['tags'] = [tag.xpath('text()').extract_first().strip() for tag in tags]
        yield scrapy.Request(
            self.api_url.format(item['id']) + '&l=ru',
            callback=self.parse_russian_description,
            meta={'item': item},
            headers=self.headers_ru,
            cookies=self.cookies,
        )

    def parse_russian_description(self, response):
        item = response.meta['item']
        json_response = json.loads(response.text)
        data = json_response[str(item['id'])]['data']
        description = data.get('detailed_description')
        if description != item['description']:
            item['description_ru'] = description
        name = clear_name(data.get('name'), self.collection)
        if name != item['name']:
            item['name_ru'] = name
        yield scrapy.Request(
            item['url'] + '?snr=1_5_9__12',
            callback=self.parse_additional_info_ru,
            meta={'item': item},
            cookies=self.cookies,
            headers=self.headers_ru,
        )

    def parse_additional_info_ru(self, response):
        item = response.meta['item']
        tags = response.css('.glance_tags.popular_tags > a')
        if tags:
            item['tags_ru'] = [tag.xpath('text()').extract_first().strip() for tag in tags]
        yield item

    @staticmethod
    def date(date, is_str=True):
        try:
            value = datetime.strptime(date, '%d %b, %Y')
        except (ValueError, TypeError):
            try:
                month = datetime.strptime(date, '%b %Y')
                if month.year == now().year and month.month == now().month:
                    month = month.replace(day=calendar.monthrange(month.year, month.month)[1])
                value = month
            except (ValueError, TypeError):
                return None
        if is_str:
            return value.isoformat()
        return pytz.utc.localize(value)
