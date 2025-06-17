import json

import scrapy
from crawlers.scrapy_settings import MONGO_URI
from crawlers.spiders import nintendo, playstation, steam, xbox, xbox360
from crawlers.utils.clear import check, clear_device, clear_name
from pymongo import MongoClient


class StartRequestsMixin:
    collection = 'platforms_release'
    base_app_url = '{}'

    def start_requests(self):
        with MongoClient(MONGO_URI) as client:
            platform_collection = client.games[self.collection]
            urls = [
                (item['url'], item['application_id'])
                for item in platform_collection.find({'platform': {'$in': self.platforms}})
            ]
        for url, app_id in urls:
            yield scrapy.Request(url=url, callback=self.parse, meta={'app_id': app_id})


class PlayStationPlatformReleaseSpider(StartRequestsMixin, playstation.PlayStationSpider):
    name = 'playstation_release'
    store = 'playstation'
    base_app_url = (
        'https://store.playstation.com/store/api/chihiro/00_09_000/container/US/en/999'
        '/{}?size=30&gkb=1&geoCountry=US&start=0'
    )
    platforms = ['playstation3', 'playstation4', 'ps-vita', 'psp']
    platforms_mapping = {'PS3': 'playstation3', 'PS4': 'playstation4', 'PS Vita': 'ps-vita', 'PSP': 'psp'}

    def start_requests(self):
        with MongoClient(MONGO_URI) as client:
            platform_collection = client.games[self.collection]
            urls = [
                self.base_app_url.format(item['application_id'])
                for item in platform_collection.find({'platform': {'$in': self.platforms}})
            ]
        for url in urls:
            yield scrapy.Request(url=url, callback=self.parse)

    def parse(self, response):
        data = json.loads(response.text)
        name = clear_name(data.get('name'), self.store)
        if not check(name, self.store):
            return

        application_id = data.get('id')
        platforms = []
        for d in data.get('playable_platform', []):
            platform = clear_device(d, self.store)
            if platform not in self.platforms_mapping:
                continue
            platforms.append(self.platforms_mapping[platform])

        return {
            'id': application_id,
            'name': name,
            'platforms': platforms,
            'release_date': data.get('release_date'),
        }


class NintendoPlatformReleaseSpider(StartRequestsMixin, nintendo.NintendoSpider):
    name = 'nintendo_release'
    store = 'nintendo'
    base_app_url = 'https://www.nintendo.com/games/detail/{}'
    platforms = ['nintendo-switch', 'nintendo-3ds', 'nintendo-ds', 'nintendo-dsi', 'wii-u', 'wii', 'neogeo']

    def parse(self, response):
        title = response.css('.title h1::text').extract_first()
        name = clear_name(title, self.store)
        if not check(name, self.store):
            return

        platform = response.css('.title .platform::text').extract_first()
        raw_release_date = response.xpath('//dd[@itemprop="releaseDate"]/text()').extract_first()
        release_date = self.get_release_date(raw_release_date)
        return {
            'name': name,
            'release_date': release_date,
            'platform': self.platform(platform) if platform else None,
            'id': response.meta['app_id'],
        }


class Xbox360PlatformReleaseSpider(StartRequestsMixin, xbox360.Xbox360Spider):
    name = 'xbox360_release'
    store = 'xbox360'
    platforms = ['xbox360']

    def get_release_date(self, response):
        option_one = self.prepare(response.xpath('//label[text()="Original release date:"]/../text()'))
        option_two = self.prepare(response.xpath('//label[text()="Release date:"]/../text()'))
        return option_one or option_two

    def parse(self, response):
        name = clear_name(response.css('h1::text').extract_first(), self.store)
        if not check(name, self.store):
            return

        release_date = self.get_release_date(response)
        return {
            'name': name,
            'release_date': self.date(release_date),
            'platform': 'xbox360',
            'id': response.meta['app_id']
        }


class XboxPlatformReleaseSpider(StartRequestsMixin, xbox.XboxSpider):
    name = 'xbox_release'
    store = 'xbox'
    platforms = ['xbox-one']

    def parse(self, response):
        name = clear_name(response.css('h1::text').extract_first(), self.store)
        if not check(name, self.store):
            return
        return {
            'id': response.meta['app_id'],
            'name': name,
            'release_date': self.obtain_release_date(response),
            'platform': 'xbox-one',
        }


class SteamPlatformReleaseSpider(StartRequestsMixin, steam.SteamSpider):
    name = 'steam_release'
    store = 'steam'
    base_app_url = 'https://store.steampowered.com/api/appdetails/?appids={}'
    platforms = ['pc', 'macos', 'linux']

    def start_requests(self):
        with MongoClient(MONGO_URI) as client:
            platform_collection = client.games[self.collection]
            urls = [
                self.base_app_url.format(item['application_id'])
                for item in platform_collection.find({'platform': {'$in': self.platforms}})
            ]
        for url in urls:
            yield scrapy.Request(
                url,
                callback=self.parse,
                headers=self.headers,
                meta={'dont_merge_cookies': True},
                cookies={}
            )

    def parse(self, response):
        json_response = json.loads(response.text)

        try:
            application_id = list(json_response.keys())[0]
        except IndexError:
            return

        if not json_response[application_id].get('success') or json_response[application_id]['data']['type'] != 'game':
            return

        data = json_response[application_id]['data']
        name = clear_name(data.get('name'), self.store)
        if not check(name, self.store):
            return
        item = {
            'name': name,
            'release_date': self.date((data.get('release_date') or {}).get('date', )),
            'platforms': [],
            'id': int(application_id),
        }
        for platform, v in data.get('platforms').items():
            if platform == 'windows':
                platform = 'pc'
            if v:
                platform_name = platform
                if platform == 'mac':
                    platform_name = 'macos'
                item['platforms'].append(platform_name)
        return item
