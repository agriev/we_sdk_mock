from crawlers.spiders.playstation import PlayStationSpider


class PlayStationUpdateSpider(PlayStationSpider):
    only_new = True
    name = 'playstation_update'
