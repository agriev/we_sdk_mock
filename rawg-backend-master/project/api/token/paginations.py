from api.paginations import PageNumberCountPagination


class CycleKarmaPagination(PageNumberCountPagination):
    page_size = 10


class GamePagination(PageNumberCountPagination):
    page_size = 10


class CycleUserPagination(PageNumberCountPagination):
    page_size = 10
