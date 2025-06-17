from django.conf import settings
from rest_framework.request import Request

from apps.common.seo import detect_noindex, trunc
from apps.reviews.models import Review


def review(obj: Review, request: Request):
    description = trunc(obj.text_bare)
    noindex = not obj.is_text or detect_noindex(obj, request)
    if request.LANGUAGE_CODE == settings.LANGUAGE_RU:
        return {
            'seo_title': f'Обзор игры {obj.game.name} от {obj.user.visible_name} на Absolute Games',
            'seo_description': description,
            'seo_keywords': '',
            'seo_h1': f'Обзор {obj.game.name}',
            'noindex': noindex,
        }
    return {
        'seo_title': f'Review of the game {obj.game.name} by {obj.user.visible_name} on AG',
        'seo_description': description,
        'seo_keywords': '',
        'seo_h1': f'{obj.game.name} review',
        'noindex': noindex,
    }
