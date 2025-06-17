import json
import os
from urllib import parse

import pymongo
import scrapy
from bson.objectid import ObjectId
from crawlers.utils.clear import clear_url
from django.conf import settings

SELECTOR_TO_RATING = {
    '.we-star-rating-stars-5': 5,
    '.we-star-rating-stars-4': 4,
    '.we-star-rating-stars-3': 3,
    '.we-star-rating-stars-2': 2,
    '.we-star-rating-stars-1': 1,
}


class IOSCommentsSpider(scrapy.Spider):
    db = None
    only_new = False
    collection = 'ios_comments'
    ids_collection = 'store_ids'
    name = 'ios_comments'
    api_url = 'https://itunes.apple.com/lookup?id={}'
    game_url = 'https://itunes.apple.com/{}/app/{}/id{}?mt=8'
    document_name = 'apple-appstore'

    download_delay = 1

    langs = {
        'de': 'Deutsch',
        'dk': 'Danish',
        'es': 'Spain',
        'fr': 'French',
        'it': 'Italian',
        'nl': 'Dutch',
        'no': 'Norsk',
        'se': 'Swedish',
    }
    proxies = None

    def get_games_ids(self):
        client = pymongo.MongoClient(settings.MONGO_HOST, settings.MONGO_PORT)
        db = client['games']
        conn = db[self.ids_collection].find_one({'name': self.document_name})
        game_ids = conn.get('ids', None)
        used_ids = db[self.collection].distinct('id')
        client.close()
        return [game_id for game_id in game_ids if int(game_id) not in used_ids]

    def start_requests(self):
        crawlera_key = os.environ.get('CRAWLERA_KEY')
        if not crawlera_key:
            return
        proxy_url = 'http://{}:@proxy.crawlera.com:8010'.format(crawlera_key)
        self.proxies = {'http': proxy_url, 'https': proxy_url}

        game_ids = self.get_games_ids()
        if not game_ids:
            return

        start_urls = []
        for game_id in game_ids:
            start_urls.append(
                self.api_url.format(game_id)
            )

        for url in start_urls:
            yield scrapy.Request(
                url=url, callback=self.parse, meta={'proxy': self.proxies['https']}
            )

    def get_application_dict(self, data):
        if 'Games' not in data.get('genres'):
            application_dict = None
        else:
            application_dict = {
                'url': clear_url(data.get('trackViewUrl'), self.collection),
                'id': data.get('trackId'),
                'reviews': []
            }
        return application_dict

    def parse_reviews(self, response):
        application_dict = response.meta.get('data')
        lang = response.meta.get('lang')

        reviews = response.css('.we-customer-review')
        if not len(reviews):
            return

        for review in reviews:
            review_data = {}
            for selector in SELECTOR_TO_RATING.keys():
                if reviews.css('.we-star-rating-stars-outlines').css(selector):
                    review_data['rating'] = SELECTOR_TO_RATING[selector]
            review_header = review.css('.we-customer-review__header--user')
            review_data['user'] = review_header.css('.we-customer-review__user::text') \
                .extract_first()
            review_data['date'] = review_header.css('.we-customer-review__date::text').extract_first()

            review_data['object_id'] = ObjectId()
            review_data['source_url'] = response.url

            try:
                parts = []
                for item in review.css('.we-customer-review__body>p::text').extract():
                    parts.append(item)

                review_data['body'] = '\n'.join(parts)
            except Exception:
                continue

            review_data['lang'] = lang

            application_dict['reviews'].append(review_data)

        return application_dict

    def parse(self, response):
        try:
            data = json.loads(response.text)['results'][0]
        except IndexError:
            return

        application_dict = self.get_application_dict(data)
        if not application_dict:
            return

        track_url = application_dict['url']
        track_id = application_dict['id']

        _, slug = parse.urlparse(track_url).path.split('/')[::-1][:2]

        review_urls = {
            lang: self.game_url.format(lang, slug, track_id)
            for lang in self.langs.keys()
        }

        for lang, review_url in review_urls.items():
            yield scrapy.Request(
                review_url,
                callback=self.parse_reviews,
                meta={
                    'data': application_dict,
                    'lang': self.langs[lang],
                    'proxy': self.proxies['http']
                }
            )
