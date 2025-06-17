"""
https://www.apptweak.io/documentation/ios/misc_categories
https://www.apptweak.io/documentation/ios/application_topchart
https://affiliate.itunes.apple.com/resources/documentation/itunes-store-web-service-search-api/#lookup
"""

import json
import os

import requests
import scrapy
from crawlers.utils.clear import check, clear_device, clear_name, clear_url
from django.template.defaultfilters import linebreaksbr


class IOSSpider(scrapy.Spider):
    db = None
    only_new = False
    collection = 'ios'
    name = 'ios'
    app_tweak_url = (
        'https://api.apptweak.com/ios/categories/{0}/top.json?country=us&language=en&device=iphone&type={1}'
    )
    api_url = 'https://itunes.apple.com/lookup?id={}'
    # developer_entity = '&entity=software'
    ru_language = '&country=ru&lang=ru'
    bad_genres = [
        'Casino',
        'Dice',
        'Educational',
        'Family',
        'Kids',
        'Trivia',
        'Word',
    ]

    def start_requests(self):
        apptweak_api_key = os.environ.get('APPTWEAK_KEY')
        if not apptweak_api_key:
            return
        games_categories_range = [
            7001,  # Game Action
            7002,  # Game Adventure
            7003,  # Game Casual
            7004,  # Game Board
            7005,  # Game Card
            7011,  # Game Music
            7012,  # Game Puzzle
            7013,  # Game Racing
            7014,  # Game Role Playing
            7015,  # Game Simulation
            7016,  # Game Sports
            7017,  # Game Strategy
        ]
        headers = {'X-Apptweak-Key': apptweak_api_key}
        free_top_games, paid_top_games = zip(*[
            (self.app_tweak_url.format(index, 'free'), self.app_tweak_url.format(index, 'paid'))
            for index in games_categories_range
        ])
        start_urls = free_top_games + paid_top_games
        for url in start_urls:
            yield scrapy.Request(url=url, headers=headers, callback=self.parse)

    def parse(self, response):
        applications = json.loads(response.body)['content']
        for application in applications:
            if not application['ratings_count'] or application['rating'] < 3:
                continue
            if self.only_new and self.db.find({'id': application['id']}).count():
                continue
            yield scrapy.Request(self.api_url.format(str(application['id'])), callback=self.parse_application)

    def parse_application(self, response):
        try:
            data = json.loads(response.text)['results'][0]
        except IndexError:
            return
        yield self.get_application_dict(data)
        # yield scrapy.Request(
        #     self.api_url.format(data.get('artistId')) + self.developer_entity,
        #     callback=self.parse_applications
        # )

    # def parse_applications(self, response):
    #     developer_apps = json.loads(response.text)['results'][1:]
    #     for application in developer_apps:
    #         yield self.get_application_dict(application)

    def get_application_dict(self, data):
        name = clear_name(data.get('trackName'), self.collection)
        if not check(name, self.collection):
            return
        if 'Games' not in data.get('genres'):
            return
        for genre in self.bad_genres:
            if genre in data.get('genres'):
                return
        description = linebreaksbr(data.get('description'))
        try:
            data_ru = requests.get(self.api_url.format(data['trackId']) + self.ru_language).json()['results'][0]
            name_ru = clear_name(data_ru.get('trackName'), self.collection)
            if name_ru == name:
                name_ru = ''
            description_ru = linebreaksbr(data_ru.get('description'))
            if description_ru == description:
                description_ru = ''
        except IndexError:
            name_ru = ''
            description_ru = ''
        application_dict = {
            'name': name,
            'name_lower': name.lower(),
            'name_ru': name_ru,
            'genres': [g for g in data.get('genres') if g.lower() != 'games'],
            'release_date': data.get('releaseDate'),
            'platforms': {
                'ios': {
                    'requirements': {
                        'devices': [clear_device(d, self.collection) for d in data.get('supportedDevices', [])]
                    }
                }
            },
            'required_age': data.get('contentAdvisoryRating'),
            'developers': [data.get('artistName')],
            'publishers': [data.get('sellerName')],
            'website': data.get('sellerUrl'),
            'screenshots': data.get('ipadScreenshotUrls') or data.get('screenshotUrls'),
            'description': description,
            'description_ru': description_ru,
            'url': clear_url(data.get('trackViewUrl'), self.collection),
            'id': data.get('trackId'),
            'language_ru': 1,
        }
        if 'mt=12' in application_dict['url']:
            application_dict['platforms'] = {'macos': {'requirements': {}}}
        return application_dict
