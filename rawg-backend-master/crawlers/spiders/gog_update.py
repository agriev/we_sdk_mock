from crawlers.spiders.gog import GogSpider


class GogUpdateSpider(GogSpider):
    only_new = True
    name = 'gog_update'
