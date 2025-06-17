from dependencies import Injector

from apps.external.models import Reddit
from apps.utils.mapper_patched import Serializer
from repositories import external as repositories
from services import external as services


class ShowReddit(Injector):
    service = services.ShowReddit
    load_reddit = repositories.load_reddit
    model_class = Reddit
    serializer = Serializer
    mapper = repositories.reddit
    game_mapper = repositories.game_for_reddit
