from crawlers.spiders.android import AndroidSpider


class AndroidUpdateSpider(AndroidSpider):
    only_new = True
    name = 'android_update'
