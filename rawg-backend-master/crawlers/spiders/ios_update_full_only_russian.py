import json

import pymongo
import scrapy
from crawlers.scrapy_settings import MONGO_URI
from crawlers.utils.clear import check, clear_name
from django.template.defaultfilters import linebreaksbr


class IOSUpdateFullOnlyRussianSpider(scrapy.Spider):
    db = None
    only_new = False
    collection = 'ios'
    name = 'ios_update_full_only_russian'
    api_url = 'https://itunes.apple.com/lookup?id={}&country=ru&lang=ru'

    def start_requests(self):
        client = pymongo.MongoClient(MONGO_URI)
        items = client['games'][self.collection]
        data = items.aggregate([{'$match': {'language_ru': 0}}], allowDiskUse=True)
        for item in data:
            yield scrapy.Request(
                self.api_url.format(item['id']),
                callback=self.parse_game,
                meta={'item': item},
            )
        client.close()

    def parse_game(self, response):
        try:
            data = json.loads(response.text)['results'][0]
        except IndexError:
            return
        item = response.meta['item']
        name_ru = clear_name(data.get('trackName'), self.collection)
        if not check(name_ru, self.collection):
            return
        description_ru = linebreaksbr(data.get('description'))
        return {
            'name_ru': name_ru if name_ru != item['name'] else '',
            'description_ru': description_ru if description_ru != item['description'] else '',
            'id': item['id'],
            'language_ru': 1,
        }
