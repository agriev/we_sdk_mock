from typing import List

from rest_framework.request import Request

from aggregates import external as aggregates
from api.paginations import PageNumberCountPagination
from apps.external import models
from apps.games.models import Game
from apps.utils.mapper_patched import Mapper

reddit = Mapper(aggregates.Reddit, models.Reddit)
game_for_reddit = Mapper(aggregates.GameForReddit, Game)


@reddit.reader
def load_reddit(
    game: aggregates.GameForReddit, pagination: PageNumberCountPagination, request: Request
) -> List[aggregates.Reddit]:
    queryset = models.Reddit.objects.filter(game_id=game.id).order_by('-pk')
    page = pagination.paginate_count_queryset_page(queryset, game.reddit_count, request)
    return page.object_list
