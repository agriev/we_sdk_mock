from crawlers.spiders.xbox360 import Xbox360Spider


class Xbox360UpdateSpider(Xbox360Spider):
    only_new = True
    name = 'xbox360_update'
