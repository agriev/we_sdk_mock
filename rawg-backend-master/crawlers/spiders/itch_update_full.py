from crawlers.spiders.itch import ItchSpider


class ItchUpdateFullSpider(ItchSpider):
    only_new = True
    only_new_full = True
    name = 'itch_update_full'
