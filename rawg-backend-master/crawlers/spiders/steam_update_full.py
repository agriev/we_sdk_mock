from crawlers.spiders.steam import SteamSpider


class SteamUpdateFullSpider(SteamSpider):
    only_new = True
    only_new_full = True
    name = 'steam_update_full'
