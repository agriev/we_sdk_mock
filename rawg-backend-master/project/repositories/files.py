from collections import OrderedDict
from typing import List, Optional

from django.template.defaultfilters import date, filesizeformat, linebreaksbr
from rest_framework.request import Request

from aggregates import files as aggregates
from api.paginations import PageNumberCountPagination
from apps.files import models
from apps.games.models import Game
from apps.utils.list import split
from apps.utils.mapper_patched import Calculated, Mapper
from apps.utils.repositories import get_file_url
from apps.utils.strings import keep_tags


def cheat_code_post_init(obj, *args):
    file_size, created = args
    attrs = OrderedDict([])
    attrs['Размер файла'] = filesizeformat(file_size)
    attrs['Файл добавлен'] = date(created)
    obj.attrs = attrs
    obj.url = get_file_url(models.CheatCode, 'file', obj.url)
    if obj.url:
        obj.url = obj.url.replace(
            'https://cdn.ag.ru/media/', 'https://downloads.ag.ru/'
        )
    obj.description = linebreaksbr(keep_tags(obj.description))
    obj.category = {
        'name': models.CheatCode.categories()[obj.category],
        'slug': obj.category,
    }


game_for_cheat_code = Mapper(aggregates.GameForCheatCode, Game, hide_from_serializer=('files_count',))
game_for_cheat_code_expanded = Mapper(aggregates.GameForCheatCodeExpanded, Game, hide_from_serializer=('files_count',))
cheat_code_mapper_args = (
    models.CheatCode,
    {
        'url': 'file',
        'attrs': Calculated(value_type=OrderedDict),
        'number': Calculated(value_type=int),
        'game': game_for_cheat_code_expanded,
    },
    ('file_size', 'created'),
    cheat_code_post_init,
)
cheat_code = Mapper(
    aggregates.CheatCode,
    *cheat_code_mapper_args
)
cheat_code_expanded = Mapper(
    aggregates.CheatCodeExpanded,
    *cheat_code_mapper_args
)

ordering = 'category', '-id'


@cheat_code.reader
def load_cheat_codes(
    game: Optional[aggregates.GameForCheatCode], category: str, pagination: PageNumberCountPagination, request: Request
) -> List[aggregates.CheatCode]:
    kwargs = {}
    if game:
        kwargs['game_id'] = game.id
    if category in models.CheatCode.categories():
        kwargs['category'] = category
    queryset = models.CheatCode.objects.filter(**kwargs).order_by(*ordering)
    count = None
    if not category and game:
        count = (game.files_count or {}).get('cheats') or 0
    page = pagination.paginate_count_queryset_page(queryset, count, request)
    if game:
        def post_iterate(row, i):
            numbers = get_numbers(game, category, pagination)
            row.number = numbers[i]
    else:
        def post_iterate(row, i):
            row.number = 0
    return page.object_list, post_iterate


@cheat_code_expanded.reader
def load_cheat_code(cheat_code_id: int, request: Request) -> aggregates.CheatCodeExpanded:
    def post_iterate(row, i):
        numbers = get_numbers(row.game)
        ids = list(
            models.CheatCode.objects.filter(game_id=row.game.id).order_by(*ordering).values_list('id', flat=True)
        )
        try:
            row.number = numbers[ids.index(cheat_code_id)]
        except (ValueError, IndexError):
            row.number = 0
    return models.CheatCode.objects.filter(id=cheat_code_id), post_iterate


def get_numbers(
    game: aggregates.GameForCheatCode, category: str = '', pagination: Optional[PageNumberCountPagination] = None
) -> list:
    cheat_codes = sorted(models.CheatCode.categories().keys())
    counters = game.files_count.get('cheats_categories') or {}
    numbers = []
    for cat in cheat_codes:
        if category and cat != category:
            continue
        numbers += list(range(1, (counters.get(cat) or 0) + 1))
    if pagination:
        try:
            return split(numbers, pagination.page_size)[pagination.page_number - 1]
        except IndexError:
            return []
    else:
        return numbers
