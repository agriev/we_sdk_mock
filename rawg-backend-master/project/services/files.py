from typing import Iterable

from attr import attrib, attrs
from stories import Failure, Result, arguments, story

from aggregates.files import CheatCode, CheatCodeExpanded


@attrs
class ShowCheatCodes:
    load_cheat_codes = attrib()

    @story
    @arguments('game', 'category', 'pagination', 'request')
    def list(I) -> Iterable[CheatCode]:
        I.get_items

    def get_items(self, ctx):
        return Result(self.load_cheat_codes(ctx.game, ctx.category, ctx.pagination, ctx.request))


@attrs
class ShowCheatCode:
    load_cheat_code = attrib()

    @story
    @arguments('cheat_code_id', 'request')
    def retrieve(I) -> CheatCodeExpanded:
        I.get_item

    def get_item(self, ctx):
        obj = self.load_cheat_code(ctx.cheat_code_id, ctx.request)
        if not obj:
            return Failure()
        return Result(obj)
