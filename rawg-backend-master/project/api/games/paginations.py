from api.paginations import PageNumberCountPagination, PageNumberPagination


class GamePagination(PageNumberCountPagination):
    page_size = 20


class GameCalendarPagination(PageNumberPagination):
    page_size = 11


class CollectionPagination(PageNumberPagination):
    page_size = 12


class PlatformPagination(PageNumberPagination):
    page_size = 50


class StorePagination(PageNumberPagination):
    page_size = 20


class GenrePagination(PageNumberPagination):
    page_size = 40


class ExternalPagination(PageNumberCountPagination):
    page_size = 10


class ListPagination(PageNumberCountPagination):
    page_size = 10


class SitemapPagination(PageNumberCountPagination):
    page_size = 10
    max_page_size = 150
