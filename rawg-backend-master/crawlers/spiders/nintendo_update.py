from crawlers.spiders.nintendo import NintendoSpider


class NintendoUpdateSpider(NintendoSpider):
    only_new = True
    name = 'nintendo_update'
