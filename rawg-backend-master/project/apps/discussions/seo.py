from django.conf import settings
from rest_framework.request import Request

from apps.common.seo import detect_noindex, trunc
from apps.discussions.models import Discussion


def discussion(obj: Discussion, request: Request):
    description = trunc(obj.text_bare)
    noindex = detect_noindex(obj, request)
    if request.LANGUAGE_CODE == settings.LANGUAGE_RU:
        return {
            'seo_title': f'Комментарий {obj.user.visible_name} об игре {obj.game.name}',
            'seo_description': description,
            'seo_keywords': '',
            'seo_h1': obj.title,
            'noindex': noindex,
        }
    return {
        'seo_title': f'{obj.user.visible_name}\'s comment about the game {obj.game.name}',
        'seo_description': description,
        'seo_keywords': '',
        'seo_h1': obj.title,
        'noindex': noindex,
    }
