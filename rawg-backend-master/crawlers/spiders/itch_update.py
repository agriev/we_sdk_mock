from crawlers.spiders.itch import ItchSpider


class ItchUpdateSpider(ItchSpider):
    only_new = True
    name = 'itch_update'
    start_url = 'https://itch.io/games/newest?format=json&page={}'
    start_urls = [start_url.format(1)]
