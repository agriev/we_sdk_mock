from crawlers.spiders.ios import IOSSpider


class IOSUpdateSpider(IOSSpider):
    only_new = True
    name = 'ios_update'
