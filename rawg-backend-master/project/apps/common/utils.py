from django.conf import settings
from django.shortcuts import resolve_url
from modeltranslation.utils import get_language


def get_share_image_url(obj, path):
    language_suffix = ''
    lang = get_language()
    if lang != settings.MODELTRANSLATION_DEFAULT_LANGUAGE:
        language_suffix = f'_{lang}'
    return '{}{}'.format(
        settings.MEDIA_URL_SITE,
        resolve_url(
            path,
            language_suffix=language_suffix, folder=obj.share_folder, hash=obj.share_name, pk=obj.id
        )
    )
