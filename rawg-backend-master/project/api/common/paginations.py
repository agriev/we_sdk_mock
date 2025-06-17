from api.paginations import PageNumberCountPagination


class ListPagination(PageNumberCountPagination):
    page_size = 10
