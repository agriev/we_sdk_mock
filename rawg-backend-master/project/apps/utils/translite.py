from transliterate import get_translit_function
from transliterate.base import registry
from transliterate.discover import autodiscover

_ru = None


def translite_ru(value):
    global _ru

    if not _ru:
        autodiscover()
        ru_registry = registry.get('ru')
        ru_registry.mapping = (
            "abvgdezijkqlmnoprstuwfh'y'ABVGDEZIJKQLMNOPRSTUWFH'Y'",
            "абвгдезийкклмнопрстууфхъыьАБВГДЕЗИЙККЛМНОПРСТУУФХЪЫЬ",
        )
        ru_registry.pre_processor_mapping = {
            "zh": "ж",
            "ts": "ц",
            "sh": "ш",
            "sch": "щ",
            "ju": "ю",
            "ja": "я",
            "ca": "ка",
            "ce": "се",
            "ci": "си",
            "co": "ко",
            "cu": "ку",
            "cb": "кб",
            "cc": "кк",
            "cd": "кд",
            "cf": "кф",
            "cg": "кг",
            "ch": "ч",
            "cj": "кж",
            "ck": "к",
            "cl": "кл",
            "cm": "км",
            "cn": "кн",
            "cp": "кп",
            "cq": "кк",
            "cr": "кр",
            "cs": "кс",
            "ct": "кт",
            "cv": "кв",
            "cw": "кв",
            "cx": "кс",
            "cy": "си",
            "cz": "кз",
            "qu": "кв",
            "wh": "в",
            "x": "кс",
            "Zh": "Ж",
            "Ts": "Ц",
            "Sh": "Ш",
            "Sch": "Щ",
            "Ju": "Ю",
            "Ja": "Я",
            "Ca": "Ка",
            "Ce": "Се",
            "Ci": "Си",
            "Co": "Ко",
            "Cu": "Ку",
            "Cb": "Кб",
            "Cc": "Кк",
            "Cd": "Кд",
            "Cf": "Кф",
            "Cg": "Кг",
            "Ch": "Ч",
            "Cj": "Кж",
            "Ck": "К",
            "Cl": "Кл",
            "Cm": "Км",
            "Cn": "Кн",
            "Cp": "Кп",
            "Cq": "Кк",
            "Cr": "Кр",
            "Cs": "Кс",
            "Ct": "Кт",
            "Cv": "Кв",
            "Cw": "Кв",
            "Cx": "Кс",
            "Cy": "Си",
            "Cz": "Кз",
            "Qu": "Кв",
            "Wh": "В",
            "X": "Кс",
        }
        _ru = get_translit_function('ru')

    return _ru(value)
