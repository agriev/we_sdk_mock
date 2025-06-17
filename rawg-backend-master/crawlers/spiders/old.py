from datetime import datetime
from math import ceil
from urllib.parse import unquote

import mwparserfromhell
import pycurl
import requests
import scrapy
import wptools
from crawlers.utils.clear import check, clear_name, clear_url
from django.utils.text import slugify

from apps.utils.wiki import WikiParser

wptools.utils.stderr = lambda msg, silent=False: None


class OldSpider(WikiParser, scrapy.Spider):
    db = None
    collection = 'old'
    name = 'old'
    base_url = 'https://en.wikipedia.org'
    pages = {
        '/wiki/List_of_Commodore_64_games': ('Commodore 64', 'links', 'columns'),
        '/wiki/List_of_Commodore_VIC-20_games': ('VIC-20', None, 'list'),
        '/wiki/List_of_Amiga_games': ('Amiga', 'table', 'columns'),
        '/wiki/List_of_Amiga_CD32_games': ('Amiga CD32', None, 'columns'),
        '/wiki/List_of_Atari_2600_games': ('Atari 2600', None, 'table'),
        '/wiki/List_of_Atari_5200_games': ('Atari 5200', None, 'table'),
        '/wiki/List_of_Atari_7800_games': ('Atari 7800', None, 'table'),
        '/wiki/List_of_Atari_ST_games': ('Atari ST', None, 'list'),
        '/wiki/List_of_Atari_XEGS_games': ('Atari XEGS', None, 'table'),
        '/wiki/List_of_Atari_Lynx_games': ('Atari Lynx', None, 'table'),
        '/wiki/List_of_Atari_Jaguar_games': ('Atari Jaguar', None, 'table'),
        '/wiki/Atari_Flashback': ('Atari Flashback', None, 'i'),
        '/wiki/List_of_Game_Boy_games': ('Game Boy', None, 'table'),
        '/wiki/List_of_Super_Game_Boy_games': ('Game Boy', None, 'list'),
        '/wiki/List_of_Game_Boy_Color_games': ('Game Boy Color', None, 'table'),
        '/wiki/List_of_Game_Boy_Advance_games': ('Game Boy Advance', None, 'table'),
        '/wiki/List_of_Sega_Genesis_games': ('Genesis', None, 'table'),
        '/wiki/List_of_Sega_CD_games': ('SEGA CD', None, 'table'),
        '/wiki/List_of_32X_games': ('SEGA 32X', None, 'table'),
        '/wiki/List_of_Nintendo_Entertainment_System_games': ('NES', None, 'table'),
        '/wiki/List_of_Super_Nintendo_Entertainment_System_games': ('SNES', None, 'table'),
        '/wiki/List_of_Nintendo_64_games': ('Nintendo 64', None, 'table'),
        '/wiki/List_of_GameCube_games': ('GameCube', None, 'table'),
        '/wiki/List_of_Dreamcast_games': ('Dreamcast', None, 'table'),
        '/wiki/List_of_PlayStation_games_(A–L)': ('PlayStation', None, 'table'),
        '/wiki/List_of_PlayStation_games_(M–Z)': ('PlayStation', None, 'table'),
    }
    games_platforms = {}

    def __init__(self, **kwargs):
        self.start_urls = []
        for url, (platform, where, how) in self.pages.items():
            response = requests.get(self.base_url + url)
            response = scrapy.http.TextResponse(url=response.url, body=response.text, encoding='utf-8')
            link_was = set()
            elements = None
            if where == 'table':
                elements = response.css('#toc a::attr(href)').extract()
            elif where == 'links':
                elements = response.xpath('//a[contains(@href,"{}")]/@href'.format(url)).extract()
            if elements:
                for link in elements:
                    link = self.base_url + link.split('#')[0]
                    if link == response.url:
                        continue
                    if link not in link_was:
                        self.applications(platform, how, link)
                    link_was.add(link)
            else:
                self.applications(platform, how, response=response)
        super().__init__(**kwargs)

    def applications(self, platform, how, link=None, response=None):
        if not response:
            response = requests.get(link)
            response = scrapy.http.TextResponse(url=response.url, body=response.text, encoding='utf-8')
        path = '.mw-parser-output > ul > li > i > a::attr(href)'
        if how == 'columns':
            path = '.mw-parser-output > .columns > ul > li > i > a::attr(href)'
        elif how == 'table':
            path = '.mw-parser-output > .wikitable i > a::attr(href)'
        elif how == 'i':
            path = '.mw-parser-output .multicol li > i > a::attr(href), ' \
                   '.mw-parser-output > ul > li > i > a::attr(href)'
        applications = response.css(path)
        for i, application in enumerate(applications):
            page_url = self.base_url + application.extract()
            if 'action=edit' in page_url:
                continue
            application_id = page_url.split('#')[0].split('/').pop()
            platforms = self.games_platforms.get(application_id) or []
            platforms.append(platform)
            self.games_platforms[application_id] = platforms
            self.start_urls.append(page_url)

    def parse(self, response):
        big_name = (response.css('h1::text').extract_first() or '').split('(')[0]
        name = response.css('h1 i::text').extract_first() or big_name
        name = clear_name(name, self.collection)
        if not check(name, self.collection):
            return

        application_id = response.url.split('/').pop()
        page = wptools.page(unquote(application_id), silent=True, verbose=False)
        try:
            page.get_query()
            page.get_parse()
            page.get_wikidata()
        except (LookupError, pycurl.error):
            return

        what = (page.data.get('what') or '').lower()
        if what not in ('video game', 'video game series'):
            return

        wikidata = self.fix_wikidata(page.data['wikidata'])
        infobox = self.fix_infobox(page.data['infobox'])

        wiki_id = page.data['title']
        genres = self.parse_genres(wikidata, infobox)
        release_date = self.parse_release_date(wikidata, infobox, wiki_id)
        platforms = {}
        for platform_name in self.games_platforms.get(application_id) or []:
            if platform_name:
                platform_slug, platform_name = self.platform(platform_name)
                platforms[platform_slug] = {'requirements': {}, 'name': platform_name}
        developers = self.parse_developers(wikidata, infobox)
        publishers = self.parse_publishers(wikidata, infobox)
        tags = self.parse_tags(wikidata, infobox)

        item = {
            'name': name,
            'wikipedia_name': wiki_id.replace('_', ' '),
            'genres': genres,
            'release_date': release_date,
            'platforms': platforms,
            'developers': developers,
            'publishers': publishers,
            'screenshots': [],
            'screenshots_small': True,
            'description': page.data.get('extract') or '',
            'tags': tags,
            'url': clear_url(page.data['url'], self.collection),
            'id': wiki_id,
        }

        moby_urls = []
        for url in response.xpath('//a[contains(@href,"mobygames.com")]/@href'):
            url = url.extract()
            if url.startswith('//'):
                url = 'http:' + url
            if not (url.startswith('http://') or url.startswith('https://')):
                continue
            moby_urls.append(url)
        if moby_urls:
            moby_id = sorted(moby_urls, key=lambda x: len(x))[0].rstrip('/').split('/').pop()
            yield scrapy.Request('https://www.mobygames.com/game/{}'.format(moby_id),
                                 callback=self.parse_platforms, errback=self.parse_moby, meta={'item': item})
        else:
            yield self.parse_moby(item=item)

    def parse_moby(self, err=None, item=None):
        if err and not item:
            item = err.request.meta['item']
        response = requests.get('http://www.mobygames.com/search/quick',
                                {'q': item['name'], 'p': '-1', 'search': 'Go', 'sFilter': '1', 'sG': 'on'})
        response = scrapy.http.TextResponse(url=response.url, body=response.text, encoding='utf-8')
        item_name = item['name'].lower()
        select_id = None
        select_years = set()
        for row in response.css('#searchResults .searchData'):
            name = row.css('.searchTitle a::text').extract_first()
            if not name:
                continue
            name = name.lower()
            second_name = None
            try:
                texts = row.css('.searchTitle::text').extract()
                if texts[-2] == ' (':
                    second_name = texts.pop().rstrip(')').strip().lower()
            except IndexError:
                pass
            moby_id = row.css('.searchTitle a::attr(href)').extract_first().rstrip('/').split('/').pop()
            years = set(map(int, row.css('.searchDetails em::text').extract()))
            year = min(years) if years else None
            if name != item_name and second_name != item_name:
                continue
            if year and select_years:
                if min(select_years) < year:
                    continue
                if year == min(select_years) and len(years) < len(select_years):
                    continue
            select_id = moby_id
            select_years = years
        if select_id:
            return scrapy.Request('https://www.mobygames.com/game/{}'.format(select_id),
                                  callback=self.parse_platforms, errback=lambda x: item, meta={'item': item})
        return item

    def parse_platforms(self, response):
        item = response.meta['item']
        platforms = response.xpath('//div[text()="Platforms"]/following-sibling::div/a/text()').extract()
        for platform in platforms:
            if not platform:
                continue
            platform_slug, platform_name = self.platform(platform)
            item['platforms'][platform_slug] = {'requirements': {}, 'name': platform_name}
        yield scrapy.Request(response.url + '/screenshots',
                             callback=self.parse_screens,
                             errback=lambda x: item,
                             meta={'item': item})

    def parse_screens(self, response):
        item = response.meta['item']
        platforms = len(response.css('h3'))
        if not platforms:
            return item
        count = max(2, int(ceil(8 / platforms)))
        base = 'http://www.mobygames.com'
        screens = []
        for row in response.css('#main .row'):
            total = 0
            for a in row.css('.thumbnail-image::attr(style)'):
                screens.append(base + a.extract().split('url(')[1].split(')')[0].replace('/s/', '/l/'))
                total += 1
                if total >= count:
                    break
        item['screenshots'] = screens
        return item

    def parse_genres(self, wikidata, infobox):
        return self.parse_items(wikidata, infobox, 'genre', 'genre', True)

    def parse_release_date(self, wikidata, infobox, wiki_id):
        date = None
        accuracy = 0
        for _, value in ((wikidata.get('publication date') or {}).get('items') or {}).items():
            new_date, new_accuracy = self.date(value.get('name'))
            if self.date_compare(date, accuracy, new_date, new_accuracy):
                date = new_date
                accuracy = new_accuracy

        released = infobox.get('released')
        if released:
            before = released.strip()
            after = self.clear_html(before)
            templates = mwparserfromhell.parse(after).filter_templates()
            if after:
                if templates:
                    dates = self.get_links_from_template(templates)
                else:
                    dates = self.get_links_from_text(after)
                dates = sorted([value['name'] for value in dates.values()], key=lambda x: len(x))
                for value in dates:
                    new_date, new_accuracy = self.date(value, True)
                    if self.date_compare(date, accuracy, new_date, new_accuracy):
                        date = new_date
                        accuracy = new_accuracy

        if not date:
            try:
                year = wiki_id.split('(')[1][0:4]
                if year.isdigit() and int(year) > 1950 and int(year) < 2018:
                    date = datetime(year=int(year), month=1, day=1)
            except (KeyError, IndexError):
                pass

        return date.isoformat() if date else None

    def date(self, date, is_info=False):
        date = str(date)
        try:
            if is_info:
                if len(date) == 4 and date.isdigit():
                    return datetime(year=int(date), month=1, day=1), 1
                if ',' not in date:
                    return datetime.strptime(date, '%B %Y'), 2
                return datetime.strptime(date, '%B %d, %Y'), 3
            date = date.lower().split('t')[0]
            accuracy = 3
            if '00-00' in date:
                date = date.replace('00-00', '01-01')
                accuracy = 1
            if '-00' in date:
                date = date.replace('-00', '-01')
                accuracy = 2
            return datetime.strptime(date, '+%Y-%m-%d'), accuracy
        except (ValueError, KeyError):
            return None, 0

    def date_compare(self, old_date, old_accuracy, new_date, new_accuracy):
        if not new_date:
            return False
        if not old_date:
            return UnicodeTranslateError
        first = new_date <= old_date and new_accuracy >= old_accuracy
        second = new_date.year == old_date.year and new_accuracy > old_accuracy
        return first or second

    def platform(self, platform):
        name = str(platform)
        slug = slugify(name)
        if slug.startswith('playstation-'):
            slug = slug.replace('playstation-', 'playstation')
        elif slug.startswith('neo-geo'):
            slug = 'neogeo'
            name = 'Neo Geo'
        elif slug == 'xbox':
            slug = 'xbox-old'
            name = 'Xbox'
        elif slug == 'xbox-one':
            slug = 'xbox-one'
        elif slug == 'xbox-360':
            slug = 'xbox360'
        elif slug == 'windows':
            slug = 'pc'
            name = 'PC'
        elif slug in ('ipad', 'iphone', 'ipod-classic', 'tvOS', 'watchOS'):
            slug = 'ios'
            name = 'iOS'
        return slug, name

    def parse_developers(self, wikidata, infobox):
        return self.parse_items(wikidata, infobox, 'developer', 'developer')

    def parse_publishers(self, wikidata, infobox):
        return self.parse_items(wikidata, infobox, 'publisher', 'publisher')

    def parse_tags(self, wikidata, infobox):
        return self.parse_items(wikidata, infobox, 'game mode', 'modes', True)

    def parse_items(self, wikidata, infobox, data_name, info_name, replace=False):
        data = {}
        for _, value in ((wikidata.get(data_name) or {}).get('items') or {}).items():
            name = self.item(value.get('name'), replace)
            data[name.lower()] = name

        item = infobox.get(info_name)
        if item:
            before = item.strip()
            after = self.clear_html(before)
            templates = mwparserfromhell.parse(after).filter_templates()
            if after:
                if templates:
                    links = self.get_links_from_template(templates)
                else:
                    links = self.get_links_from_text(after)
                for _, value in links.items():
                    name = self.item(value.get('name'), replace)
                    if len(name) <= 2:
                        continue
                    if name.lower() not in data:
                        data[name.lower()] = name

        return list(data.values())

    def item(self, item, replace):
        name = str(item)
        if replace:
            name = name.replace('video game', '')
            name = name.replace(' game', '')
        return name.strip()
