from api.paginations import PageNumberCountPagination


class StoryPagination(PageNumberCountPagination):
    page_size = 10
    max_page_size = 10


class StoryShortPagination(StoryPagination):
    max_page_size = 50
