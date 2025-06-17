from crawlers.spiders.steam import SteamSpider


class SteamUpdateSpider(SteamSpider):
    only_new = True
    name = 'steam_update'
