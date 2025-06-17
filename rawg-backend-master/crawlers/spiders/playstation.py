import math
import os
from time import sleep

import requests
import scrapy
from crawlers.utils.clear import check, clear_device, clear_name, clear_url
from simplejson import JSONDecodeError


class PlayStationSpider(scrapy.Spider):
    db = None
    only_new = False
    collection = 'playstation'
    name = 'playstation'
    start_urls = []
    page_size = 30
    start_url_en = (
        f'https://store.playstation.com/valkyrie-api/en/US/999/container/'
        f'STORE-MSF77008-ALLGAMES?size={page_size}&bucket=games'
    )
    start_url_ru = (
        f'https://store.playstation.com/valkyrie-api/ru/RU/999/container/'
        f'STORE-MSF75508-FULLGAMES?size={page_size}&bucket=games'
    )
    game_url = 'https://store.playstation.com/en-us/product/{}'
    platforms = {'PS3': 'playstation3', 'PS4': 'playstation4', 'PS Vita': 'ps-vita', 'PSP': 'psp'}
    find_by_name = True
    proxy = os.environ.get('PROXY_ONE')
    proxies = {'http': proxy, 'https': proxy} if proxy else None

    def start_requests(self):
        yield scrapy.Request('https://ag.ru/', dont_filter=True, callback=self.parse)

    def parse(self, response):
        games_by_id = {}
        games_by_name = {}
        for game in self.process_lang(self.start_url_en):
            game['name'] = clear_name(game['name'], self.collection)
            if not check(game['name'], self.collection):
                continue
            check_id = {'raw_id': game['raw-id']}
            check_name = {'name_lower': game['name'].lower()}
            if self.only_new and (self.db.find(check_id).count() or self.db.find(check_name).count()):
                continue
            games_by_id[game['raw-id']] = game
            games_by_name[game['name']] = game
        for game in self.process_lang(self.start_url_ru):
            find_game = games_by_id.get(game['raw-id']) or games_by_name.get(game['name'])
            if not find_game:
                continue
            find_game['name-ru'] = game['name']
            find_game['long-description-ru'] = game['long-description']
        for item in games_by_id.values():
            platforms = {}
            for d in item.get('platforms') or []:
                platform = clear_device(d, self.collection)
                if platform not in self.platforms:
                    continue
                platforms[self.platforms[platform]] = {'requirements': {}}
            name_ru = item.get('name-ru') or ''
            if name_ru == item['name']:
                name_ru = ''
            description = item.get('long-description') or ''
            description_ru = item.get('long-description-ru') or ''
            if description_ru == description:
                description_ru = ''
            yield {
                'name': item['name'],
                'name_lower': item['name'].lower(),
                'name_ru': name_ru,
                'genres': item.get('genres') or [],
                'release_date': item.get('release-date'),
                'platforms': platforms,
                'developers': [item.get('provider')],
                'screenshots': [s['url'] for s in (item.get('media-list') or {}).get('screenshots', {})],
                'description': description,
                'description_ru': description_ru,
                'url': clear_url(self.game_url.format(item['id']), self.collection),
                'id': item['id'],
                'raw_id': item['raw-id'],
                'language_ru': 1,
            }

    def process_lang(self, url):
        games, total = self.process_page(url)
        pages = int(math.ceil(total / self.page_size))
        for page in range(2, pages + 1):
            add_games, _ = self.process_page('{}&start={}'.format(url, (page - 1) * self.page_size))
            games += add_games
        return games

    def process_page(self, url):
        try:
            data = requests.get(url, proxies=self.proxies).json()
        except JSONDecodeError:
            sleep(10)
            data = requests.get(url, proxies=self.proxies).json()
        game_data = {}
        for row in data['included']:
            game_data[row['id']] = row['attributes']
            game_data[row['id']]['id'] = row['id']
            # TODO it's impossible find common id for all countries
            game_data[row['id']]['raw-id'] = row['id'].split('-')[1]
        games = []
        for row in data['data']['relationships']['children']['data']:
            if not game_data.get(row['id']):
                continue
            games.append(game_data[row['id']])
        return games, data['data']['attributes']['total-results']
