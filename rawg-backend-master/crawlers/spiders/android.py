"""
https://www.apptweak.io/documentation/android/misc_categories
https://www.apptweak.io/documentation/android/application_topchart
"""
import json
import os
import subprocess

import scrapy
from crawlers.utils.clear import check, clear_name


class AndroidSpider(scrapy.Spider):
    db = None
    only_new = False
    collection = 'android'
    name = 'android'
    handle_httpstatus_list = [200, 500]
    android_js_app = 'spiders/android_js/app.js'
    # android_js_developer = 'spiders/android_js/developer.js'
    app_tweak_url = 'https://api.apptweak.com/android/categories/{0}/top.json?country=us&language=en&type={1}'
    bad_genres = [
        'Casino',
        'Dice',
        'Educational',
        'Family',
        'Kids',
        'Trivia',
        'Word',
    ]

    def __init__(self, name=None, **kwargs):
        self.apptweak_api_key = os.environ.get('APPTWEAK_KEY')
        subprocess.check_call(['npm', 'install', 'google-play-scraper'])
        super().__init__(name, **kwargs)

    def start_requests(self):
        if not self.apptweak_api_key:
            return
        games_categories = [
            'GAME_ACTION',
            'GAME_ADVENTURE',
            'GAME_ARCADE',
            'GAME_BOARD',
            'GAME_CARD',
            'GAME_CASUAL',
            'GAME_MUSIC',
            'GAME_PUZZLE',
            'GAME_RACING',
            'GAME_ROLE_PLAYING',
            'GAME_SIMULATION',
            'GAME_SPORTS',
            'GAME_STRATEGY',
        ]
        free_top_games, paid_top_games = zip(*[
            (self.app_tweak_url.format(category, 'free'), self.app_tweak_url.format(category, 'paid'))
            for category in games_categories
        ])
        for url in free_top_games + paid_top_games:
            yield scrapy.Request(
                url=url,
                headers={'X-Apptweak-Key': self.apptweak_api_key},
                callback=self.parse
            )

    def parse(self, response):
        applications = json.loads(response.body)['content']
        for application in applications:
            if not application['ratings_count'] or application['rating'] < 3:
                continue
            if self.only_new and self.db.find({'id': application['id']}).count():
                return

            try:
                app_data = json.loads(
                    subprocess.check_output([
                        'node', self.android_js_app, application['id'], 'en', 'us'
                    ]).decode('utf-8')
                )
            except json.JSONDecodeError:
                continue
            if not app_data:
                continue

            app_name, app_screens = self.obtain_raw_data(app_data)
            if not app_name:
                continue
            yield self.get_application_dict(app_data, app_name, app_screens)

            # try:
            #     developer_apps = json.loads(
            #         subprocess
            #         .check_output(['node', self.android_js_developer, application['developer'], 'en', 'us'])
            #         .decode('utf-8')
            #     )
            # except json.JSONDecodeError:
            #     continue
            #
            # for developer_app in developer_apps or []:
            #     dev_app_name, dev_app_screens = self.obtain_raw_data(developer_app)
            #     if not dev_app_name:
            #         continue
            #     yield self.get_application_dict(developer_app, dev_app_name, dev_app_screens)

    def get_application_dict(self, data, name, screens):
        if 'GAME' not in data.get('genreId', ''):
            return
        for genre in self.bad_genres:
            if genre == data.get('genre'):
                return
        description = data.get('descriptionHTML')
        data_ru = json.loads(subprocess.check_output([
            'node', self.android_js_app, data.get('appId'), 'ru', 'ru'
        ]).decode('utf-8'))
        name_ru, _ = self.obtain_raw_data(data_ru)
        description_ru = data_ru.get('descriptionHTML')
        if not name_ru:
            name_ru = ''
            description_ru = ''
        if name_ru == name:
            name_ru = ''
        if description_ru == description:
            description_ru = ''
        return {
            'name': name,
            'name_lower': name.lower(),
            'name_ru': name_ru,
            'genres': [data.get('genre')],
            'platforms': {
                'android': {
                    'requirements': {
                        'minimum': data.get('androidVersionText')
                    }
                }
            },
            'required_age': data.get('contentRating'),
            'developers': [data.get('developer')],
            'screenshots': screens,
            'description': description,
            'description_ru': description_ru,
            'url': data.get('url'),
            'id': data.get('appId'),
            'language_ru': 1,
        }

    def obtain_raw_data(self, data):
        try:
            name = clear_name(data['title'], self.collection)
        except (KeyError, TypeError):
            return None, None
        if not check(name, self.collection):
            return None, None
        screens = []
        for screen in data.get('screenshots'):
            if screen.startswith('http:'):
                screen = screen[5:]
            if screen.startswith('https:'):
                screen = screen[6:]
            screens.append('https:{}'.format(screen.replace('=h310', '=h1240')))
        return name, screens
