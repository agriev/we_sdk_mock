from api.paginations import PageNumberCountPagination


class UsersPagination(PageNumberCountPagination):
    page_size = 10
