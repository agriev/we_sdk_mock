import json
import subprocess

import pymongo
from crawlers.scrapy_settings import MONGO_URI
from crawlers.spiders.android import AndroidSpider
from crawlers.utils.clear import clear_name
from scrapy import Request


class AndroidUpdateFullOnlyRussianSpider(AndroidSpider):
    name = 'android_update_full_only_russian'

    def __init__(self, name=None, **kwargs):
        subprocess.check_call(['npm', 'install', 'google-play-scraper'])
        super().__init__(name, **kwargs)

    def start_requests(self):
        yield Request('https://ag.ru/', dont_filter=True, callback=self.parse)

    def parse(self, response):
        client = pymongo.MongoClient(MONGO_URI)
        items = client['games'][self.collection]
        data = items.aggregate([{'$match': {'language_ru': 0}}], allowDiskUse=True)
        for item in data:
            try:
                app_data = json.loads(subprocess.check_output([
                    'node', self.android_js_app, item['id'], 'ru', 'ru'
                ]).decode('utf-8'))
            except json.JSONDecodeError:
                continue
            if not app_data:
                continue
            try:
                name_ru = clear_name(app_data['title'], self.collection)
            except KeyError:
                continue
            yield self.get_application_dict_ru(app_data, name_ru, item)
        client.close()

    def get_application_dict_ru(self, data, name_ru, item):
        description_ru = data.get('descriptionHTML')
        if name_ru == item['name']:
            name_ru = ''
        if description_ru == item['description']:
            description_ru = ''
        return {
            'name_ru': name_ru,
            'description_ru': description_ru,
            'id': data.get('appId'),
            'language_ru': 1,
        }
