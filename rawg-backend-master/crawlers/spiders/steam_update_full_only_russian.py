import json

import pymongo
import scrapy
from crawlers.scrapy_settings import MONGO_URI
from crawlers.utils.clear import check, clear_name


class SteamUpdateFullOnlyRussianSpider(scrapy.Spider):
    db = None
    only_new = False
    only_new_full = False
    collection = 'steam'
    name = 'steam_update_full_only_russian'
    download_delay = 1.5
    api_url = 'https://store.steampowered.com/api/appdetails/?appids={}&l=ru'
    store_url = 'https://store.steampowered.com/app/{}/'
    cookies = {
        'lastagecheckage': '16-January-1970',
        'birthtime': '1285201',
        'mature_content': 1,
    }
    headers_ru = {
        'Accept-Language': 'ru;q=0.8,en-US;q=0.5,en;q=0.3'
    }

    def start_requests(self):
        client = pymongo.MongoClient(MONGO_URI)
        items = client['games'][self.collection]
        data = items.aggregate([{'$match': {'language_ru': 0}}], allowDiskUse=True)
        for item in data:
            yield scrapy.Request(
                self.api_url.format(item['id']),
                callback=self.parse_game,
                headers=self.headers_ru,
                meta={'dont_merge_cookies': True, 'item': item},
                cookies={}
            )
        client.close()

    def parse_game(self, response):
        json_response = json.loads(response.text)
        item = response.meta['item']
        application_id = str(item['id'])

        if not json_response[application_id].get('success') or json_response[application_id]['data']['type'] != 'game':
            return

        data = json_response[application_id]['data']
        name = clear_name(data.get('name'), self.collection)
        if not check(name, self.collection):
            return
        description = data.get('detailed_description')

        new_item = {
            'name_ru': name if name != item['name'] else '',
            'description_ru': description if description != item['description'] else '',
            'id': item['id'],
            'language_ru': 1,
        }
        yield scrapy.Request(
            item['url'],
            callback=self.parse_additional_info_ru,
            meta={'item': new_item},
            cookies=self.cookies,
            headers=self.headers_ru,
        )

    def parse_additional_info_ru(self, response):
        item = response.meta['item']
        tags = response.css('.glance_tags.popular_tags > a')
        if tags:
            item['tags_ru'] = [tag.xpath('text()').extract_first().strip() for tag in tags]
        yield item
