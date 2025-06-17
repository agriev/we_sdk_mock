from attr import attrs
from stories import Result, arguments, story


@attrs
class ShowCounters:
    @story
    @arguments('game', 'request')
    def reviews_text_count(I):
        I.get_reviews_text_count

    @story
    @arguments('game', 'request')
    def collections_count(I):
        I.get_collections_count

    @story
    @arguments('game', 'request')
    def discussions_count(I):
        I.get_discussions_count

    @story
    @arguments('game', 'request')
    def parent_achievements_count(I):
        I.get_parent_achievements_count

    def _condition(self, ctx):
        return ctx.request.user.is_authenticated or not ctx.request.API_CLIENT_IS_WEBSITE

    def get_reviews_text_count(self, ctx):
        if self._condition(ctx):
            return Result(ctx.game.reviews_text_count_all)
        return Result(ctx.game.reviews_text_count)

    def get_collections_count(self, ctx):
        if self._condition(ctx):
            return Result(ctx.game.collections_count_all)
        return Result(ctx.game.collections_count)

    def get_discussions_count(self, ctx):
        if self._condition(ctx):
            return Result(ctx.game.discussions_count_all)
        return Result(ctx.game.discussions_count)

    def get_parent_achievements_count(self, ctx):
        if self._condition(ctx):
            return Result(ctx.game.parent_achievements_count_all)
        return Result(ctx.game.parent_achievements_count)
