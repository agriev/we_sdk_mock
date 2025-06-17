from aggregates import games as aggregates
from apps.games import models
from apps.utils.mapper_patched import Mapper
from apps.utils.mappers.mapper import Evaluated

game = Mapper(aggregates.Game, models.Game, {
    'reviews_text_count': Evaluated(),
    'collections_count': Evaluated(),
    'discussions_count': Evaluated(),
    'parent_achievements_count': Evaluated(),
})
