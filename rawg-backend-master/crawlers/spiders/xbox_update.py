from crawlers.spiders.xbox import XboxSpider


class XboxUpdateSpider(XboxSpider):
    only_new = True
    name = 'xbox_update'
