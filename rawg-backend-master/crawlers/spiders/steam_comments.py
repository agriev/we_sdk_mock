import os

import pymongo
import scrapy
from bs4 import BeautifulSoup
from bson.objectid import ObjectId
from django.conf import settings


class SteamCommentsSpider(scrapy.Spider):
    db = None
    only_new = False
    collection = 'steam_comments'
    ids_collection = 'steam_ids'
    game_url = ''.join([
        'https://steamcommunity.com/app/{}/{}?p=1&browsefilter=toprated&',
        'l=english&appHubSubSection=10&filterLanguage={}&searchText=&forceanon=1'
    ])
    public_url = 'https://steamcommunity.com/app/{}/reviews/?p=1&browsefilter=toprated&filterLanguage={}#scrollTop=73'
    document_name = 'steam'
    api_url = 'homecontent/'
    name = "steam_comments"

    download_delay = 1

    langs = {
        'norwegian': 'Norsk',
        'danish': 'Danish',
        'russian': 'Russian',
        'italian': 'Italian',
        'swedish': 'Swedish',
        'dutch': 'Dutch',
        'spanish': 'Spain',
        'french': 'French',
        'german': 'Deutsch',
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
        crawlera_key = os.environ.get('CRAWLERA_KEY_SCRAPING')
        if not crawlera_key:
            return
        proxy_url = 'http://{}:@proxy.crawlera.com:8010'.format(crawlera_key)
        self.proxies = {'http': proxy_url, 'https': proxy_url}

        game_ids = self.get_games_ids()
        if not game_ids:
            return

        start_requests = []

        for game_id in game_ids:
            start_requests = []
            for lang in self.langs.keys():
                url = self.game_url.format(game_id, self.api_url, lang)
                public_url = self.public_url.format(game_id, lang)
                game_data = {'id': game_id, 'url': public_url}
                application_dict = self.get_application_dict(game_data)
                start_requests.append(
                    scrapy.Request(
                        url,
                        callback=self.parse,
                        meta={
                            'proxy': self.proxies['https'],
                            'data': application_dict,
                            'game_id': game_id,
                            'lang': self.langs[lang],
                            'url': public_url,
                            'start_requests': start_requests
                        }
                    )
                )

            yield start_requests.pop()

    def parse(self, response):
        application_dict = response.meta.get('data')
        lang = response.meta.get('lang')
        url = response.meta.get('url')

        all_cards = response.css('.apphub_Card')
        for item in all_cards:
            author = item \
                .css('.apphub_friend_block') \
                .css('.apphub_CardContentAuthorName>a::text') \
                .extract_first()

            avatar = item.css('div.appHubIconHolder.offline>img::attr(src)').extract_first()

            text_selector = item.css('.apphub_CardTextContent')

            text_block = ' '.join([text_item for text_item in text_selector.extract()])

            date_published_str = text_selector.css('.date_posted').extract_first()
            text_extract = text_block.replace(date_published_str, '')

            text_clean = self.clean_text(text_extract)

            rating = self.clean_rating(response)

            date_published = self.clean_text(date_published_str).replace('Posted: ', '')

            review_data = {
                'object_id': ObjectId(),
                'date': date_published,
                'user': author,
                'lang': lang,
                'source_url': url,
                'rating': rating,
                'body': text_clean,
                'avatar': avatar
            }

            application_dict['reviews'].append(review_data)

        symbols_len = sum([len(r.get('body')) for r in application_dict['reviews']])

        if symbols_len <= 3000:
            start_requests = response.meta.get('start_requests')
            if start_requests:
                request = start_requests.pop()
                request.meta['start_requests'] = start_requests
                request.meta['data'] = application_dict
                yield request
            else:
                yield application_dict
        else:
            yield application_dict

        yield application_dict

    def get_application_dict(self, data):
        return {
            'url': data['url'],
            'id': data.get('id'),
            'reviews': [],
            'is_new': 1,
        }

    def clean_text(self, text):
        soup = BeautifulSoup(text, 'html.parser')
        return soup.get_text('\n').strip()

    def clean_rating(self, response):
        text = response.css('.thumb>img::attr(src)').extract_first().split('/')[-1].split('_')[1]
        if text.startswith('thumbsUp'):
            return 5
        elif text.startswith('thumbsDown'):
            return 1
