from api.paginations import PageNumberPagination
from apps.feed.models import Feed


class FeedPagination(PageNumberPagination):
    page_size = Feed.ON_PAGE


class ReactionPagination(PageNumberPagination):
    page_size = 5
