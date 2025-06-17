from rest_framework.pagination import LimitOffsetPagination

from api.paginations import PageNumberCountPagination


class ReviewPagination(PageNumberCountPagination):
    page_size = 10


class ReviewMainPagination(PageNumberCountPagination):
    page_size = 10


class ReviewCarouselPagination(LimitOffsetPagination):
    default_limit = 10
    limit_query_param = 'page_size'


class ReviewTop100CarouselPagination(PageNumberCountPagination):
    page_size = 100
    count_queryset = 100
