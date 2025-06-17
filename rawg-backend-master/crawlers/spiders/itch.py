import json
from datetime import datetime

import requests
import scrapy
from crawlers.utils.clear import check, clear_name, clear_url

from apps.utils.strings import keep_tags


class ItchSpider(scrapy.Spider):
    db = None
    only_new = False
    only_new_full = False
    collection = 'itch'
    name = 'itch'

    start_url = 'https://itch.io/games?format=json&page={}'
    start_urls = [start_url.format(1)]

    def parse(self, response):
        result = json.loads(response.text)
        html_content = scrapy.http.TextResponse(url=response.url, body=result['content'], encoding='utf-8')
        continues = 0
        for game_cell in html_content.css('.game_cell'):
            application_id = int(game_cell.css('::attr(data-game_id)').extract_first())
            if self.only_new and self.db.find({'id': application_id}).count():
                if not self.only_new_full:
                    continues += 1
                continue
            url = game_cell.css('a.game_link::attr(href)').extract_first()
            headers = None
            sub_url = url.split('://').pop().split('.').pop(0)
            if '_' in sub_url:
                # for example https://_oreo_.itch.io/stellar-cat-damon, https://q_dork.itch.io/hungry-buddy
                sub_url = '{}.itch.io'.format(sub_url)
                ip = requests.get('http://ip-api.com/json/{}'.format(sub_url)).json()['query']
                url = url.replace(sub_url, ip, 1)
                headers = {'Host': sub_url}
            yield scrapy.Request(
                url,
                headers=headers,
                callback=self.parse_game,
                meta={'item': {
                    'id': application_id,
                    'is_free': not bool(game_cell.css('.price_tag').extract_first())
                }}
            )
        if int(result['num_items']) < 30 or continues == 30 or not html_content:
            return
        yield scrapy.Request(self.start_url.format(int(result['page']) + 1), callback=self.parse)

    def parse_game(self, response):
        item = response.meta['item']

        name = clear_name(response.css('h1::text').extract_first(), self.collection)
        if not check(name, self.collection):
            return

        if not response.css('.game_info_panel_widget').extract():
            # for example http://itch.io/io-games/narwhale
            return

        release_date = response.xpath('//td[text()="Published"]/../td/abbr/@title').extract_first()
        item.update({
            'name': name,
            'description': keep_tags(response.css('.formatted_description').extract_first()),
            'release_date': self.date(release_date),
            'platforms': {},
            'developers': response.xpath(
                '//td[text()="Author"]/../td/a/text() | //td[text()="Authors"]/../td/a/text()'
            ).extract(),
            'genres': response.xpath('//td[text()="Genre"]/../td/a/text()').extract(),
            'tags': response.xpath('//td[text()="Tags"]/../td/a/text()').extract(),
            'screenshots': response.css('.screenshot_list a::attr(href)').extract(),
            'url': clear_url(response.url, self.collection),
        })
        for platform in response.xpath('//td[text()="Platforms"]/../td/a/@href').extract():
            platform = self.platform(platform.lower().split('/').pop().replace('platform-', ''))
            if not platform:
                continue
            item['platforms'][platform] = {'requirements': {}}
        if not item['platforms']:
            item['platforms']['pc'] = {'requirements': {}}

        yield item

    @staticmethod
    def date(date):
        if not date:
            return None
        date = date.split('@')[0].strip()
        try:
            return datetime.strptime(date, '%d %B %Y').isoformat()
        except TypeError:
            return None

    @staticmethod
    def platform(header):
        if header == 'windows':
            return 'pc'
        if header == 'osx':
            return 'macos'
        if header in ('html5', 'flash'):
            return 'web'
        if header in ('unity', 'java'):
            return None
        return header
