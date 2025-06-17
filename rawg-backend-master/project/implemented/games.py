from dependencies import Injector

from services import games as services


class ShowCounters(Injector):
    service = services.ShowCounters
