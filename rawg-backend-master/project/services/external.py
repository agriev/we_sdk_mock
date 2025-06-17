from attr import attrib, attrs
from django.conf import settings
from stories import Result, Success, arguments, story


@attrs
class ShowReddit:
    load_reddit = attrib()

    @story
    @arguments('game', 'pagination', 'request')
    def list(I):
        I.check_available
        I.get_items

    @story
    @arguments('count', 'request')
    def count(I):
        I.check_available
        I.get_count

    def check_available(self, ctx):
        if ctx.request.LANGUAGE_CODE == settings.LANGUAGE_RU:
            return Success(available=False)
        return Success(available=True)

    def get_items(self, ctx):
        if not ctx.available:
            return Result([])
        return Result(self.load_reddit(ctx.game, ctx.pagination, ctx.request))

    def get_count(self, ctx):
        if not ctx.available:
            return Result(0)
        return Result(ctx.count)
