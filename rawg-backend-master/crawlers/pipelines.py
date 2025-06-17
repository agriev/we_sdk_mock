import pymongo
from django.utils.timezone import now


class MongoPipeline(object):
    def __init__(self, mongo_uri, mongo_db):
        self.mongo_uri = mongo_uri
        self.mongo_db = mongo_db
        self.platforms_collection = 'platforms_release'
        self.reviews_collections = ['ios_comments', 'steam_comments']

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            mongo_uri=crawler.settings.get('MONGO_URI'),
            mongo_db=crawler.settings.get('MONGO_DATABASE', 'items')
        )

    def open_spider(self, spider):
        self.client = pymongo.MongoClient(self.mongo_uri)
        self.db = spider.db = self.client[self.mongo_db][getattr(spider, 'collection', spider.name)]

    def close_spider(self, spider):
        self.client.close()

    # def update_item_platform_release(self, item):
    #     search_value = {'name': item['name'], 'application_id': item['id']}
    #     update_value = {'$set': {'release_date': item['release_date']}}
    #     self.db.update_one(search_value, update_value)
    #     return item
    #
    # def update_item_platforms_release(self, item):
    #     if 'platforms' not in item.keys():
    #         return self.update_item_platform_release(item)
    #
    #     for platform_slug in item.get('platforms', []):
    #         new_item = {
    #             'id': item['id'],
    #             'name': item['name'],
    #             'platform': platform_slug,
    #             'release_date': item['release_date'],
    #         }
    #         self.update_item_platform_release(new_item)
    #
    # def store_item_reviews(self, item):
    #     results = self.db.find_one({'id': item['id']})
    #     if results:
    #         if not item.get('reviews'):
    #             return
    #         for review in item['reviews']:
    #             search_value = {'id': item['id']}
    #             update_value = {'$addToSet': {'reviews': review}}
    #             self.db.update_one(search_value, update_value)
    #     else:
    #         self.db.insert(dict(item))

    def process_item(self, item, spider):
        # if spider.collection == self.platforms_collection:
        #     return self.update_item_platforms_release(item)
        #
        # if spider.collection in self.reviews_collections:
        #     return self.store_item_reviews(item)

        # check if id exists
        condition = {'id': item['id']}
        results = self.db.find(condition)
        if results.count():
            return self.only_update(item, results[0], condition, spider)
        # check if name exists
        if hasattr(spider, 'find_by_name') and item.get('name_lower'):
            condition = {'name_lower': item['name_lower']}
            results = self.db.find(condition)
            if results.count():
                return self.only_update(item, results[0], condition, spider)
        item['new'] = 1
        item['created'] = now()
        self.db.insert(dict(item))
        return item

    def only_update(self, item, old, condition, spider):
        # update only some fields
        if spider.only_new:
            return item
        update = {
            'new': 1,
            'screenshots': (old.get('screenshots') or []) + (item.get('screenshots') or []),
            'name_lower': item.get('name_lower') or old.get('name_lower') or '',
            'description': item.get('description') or old.get('description') or '',
            'description_ru': item.get('description_ru') or old.get('description_ru') or '',
            'name_ru': item.get('name_ru') or old.get('name_ru') or '',
            'tags_ru': item.get('tags_ru') or old.get('tags_ru') or [],
            'language_ru': 1 if item.get('language_ru') else 0
        }
        if item.get('release_date') and old.get('release_date') and item['release_date'] < old['release_date']:
            update['release_date'] = item.get('release_date')
        if item.get('platforms'):
            for platform, values in item['platforms'].items():
                new_devices = (values.get('requirements') or {}).get('devices')
                if new_devices:
                    old_platform = (old.get('platforms') or {}).get(platform) or {}
                    old_devices = (old_platform.get('requirements') or {}).get('devices') or []
                    update['platforms'] = {
                        platform: {
                            'requirements': {
                                'devices': old_devices + new_devices
                            }
                        }
                    }
        if update:
            self.db.update_one(condition, {'$set': update})
        return item
