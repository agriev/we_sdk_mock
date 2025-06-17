from dependencies import Injector

from apps.files.models import CheatCode
from apps.utils.mapper_patched import Serializer
from repositories import files as repositories
from services import files as services


class CheatCodeBase(Injector):
    model_class = CheatCode
    serializer = Serializer


class ShowCheatCodes(CheatCodeBase):
    service = services.ShowCheatCodes
    load_cheat_codes = repositories.load_cheat_codes
    mapper = repositories.cheat_code
    game_mapper = repositories.game_for_cheat_code


class ShowCheatCode(CheatCodeBase):
    service = services.ShowCheatCode
    load_cheat_code = repositories.load_cheat_code
    mapper = repositories.cheat_code_expanded
    game_aggregate_class = repositories.game_for_cheat_code_expanded
