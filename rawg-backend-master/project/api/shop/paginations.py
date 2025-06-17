from api.paginations import PageNumberCountPagination


class ProductPagination(PageNumberCountPagination):
    page_size = 10
