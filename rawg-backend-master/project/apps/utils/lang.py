import re

import langdetect
import pycountry
from accept_language import (
    DEFAULT_QUALITY_VALUE, MAX_HEADER_LEN, QUALITY_VAL_SUB_REGEX, VALIDATE_LANG_REGEX, Lang, attrgetter,
)
from django.conf import settings
from django.contrib.sites.models import Site
from django.db.models import Case, IntegerField, When
from django.http import HttpRequest
from langdetect.lang_detect_exception import LangDetectException
from modeltranslation.utils import get_language


def parse_accept_language(accept_language_str, default_quality=None):
    if not accept_language_str:
        return []

    if len(accept_language_str) > MAX_HEADER_LEN:
        raise ValueError('Accept-Language too long, max length is 8192')

    parsed_langs = []
    for accept_lang_segment in accept_language_str.split(','):
        quality_value = default_quality or DEFAULT_QUALITY_VALUE
        lang_code = accept_lang_segment.strip()
        if ';' in accept_lang_segment:
            lang_code, quality_value = accept_lang_segment.split(';', 1)
            try:
                quality_value = float(QUALITY_VAL_SUB_REGEX.sub('', quality_value))
            except ValueError:
                quality_value = 1

        lang_code_components = re.split('-|_', lang_code)
        if not all(VALIDATE_LANG_REGEX.match(c) for c in lang_code_components):
            continue

        if len(lang_code_components) == 1:
            # language code 2/3 letters, e.g. fr
            language = lang_code_components[0].lower()
            locale = None
        else:
            # full language tag, e.g. en-US
            language = lang_code_components[0].lower()
            locale = '{}_{}'.format(
                language, lang_code_components[1].upper(),
            )
        parsed_langs.append(
            Lang(locale=locale, language=language, quality=quality_value)
        )
    return sorted(parsed_langs, key=attrgetter('quality'), reverse=True)


def get_languages(request):
    if not request.user.is_authenticated:
        return [settings.DEFAULT_LANGUAGE]
    languages = []
    for lang in parse_accept_language(request.META.get('HTTP_ACCEPT_LANGUAGE', '')):
        if lang.language not in languages:
            languages.append(lang.language)
    languages_iso_3 = []
    for lang in languages:
        country = pycountry.languages.get(alpha_2=lang)
        if country:
            languages_iso_3.append(country.alpha_3)
    if settings.DEFAULT_LANGUAGE not in languages_iso_3:
        languages_iso_3.append(settings.DEFAULT_LANGUAGE)
    return languages_iso_3


def get_languages_condition(request):
    languages = get_languages(request)
    if request.LANGUAGE_CODE != settings.MODELTRANSLATION_DEFAULT_LANGUAGE:
        if request.LANGUAGE_CODE_ISO3 not in languages:
            languages = [request.LANGUAGE_CODE_ISO3] + languages
        else:
            languages = sorted(languages, key=lambda val: val != request.LANGUAGE_CODE_ISO3)
    cases = [When(language=lang, then=i) for i, lang in enumerate(languages)]
    return Case(*cases, default=len(languages), output_field=IntegerField())


def sort_by_language(request, items):
    languages = get_languages(request)

    def sort_lang(row):
        if row['language'] in languages:
            return languages.index(row['language'])
        return len(languages)

    return sorted(items, key=sort_lang)


def sort_by_two_languages(request, items, get_item_first, get_item_second):
    languages = get_languages(request)[::-1]

    def sort_lang(row):
        l1 = get_item_first(row)
        l2 = get_item_second(row)
        if l1 in languages and l2 in languages:
            return languages.index(l1) + languages.index(l2)
        if l1 in languages or l2 in languages:
            return languages.index(l1 if l1 in languages else l2)
        return -1

    return sorted(items, key=sort_lang, reverse=True)


def get_lang(accept_language_str):
    languages = parse_accept_language(accept_language_str)
    if not languages:
        return None
    if languages[0].locale:
        return languages[0].locale.lower().replace('_', '-')
    return languages[0].language


def local_lang_detect(text):
    try:
        lang_iso_1 = langdetect.detect(text).split('-')[0]
    except LangDetectException:
        return False
    if lang_iso_1 not in settings.SAFE_LANGUAGES:
        return False
    return lang_iso_1


def check_russian_letters(text):
    text = text.lower()
    for letter in 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя':
        if letter in text:
            return True
    return False


def fake_request_by_language(language):
    if len(language) == 3:
        language = settings.LANGUAGES_3_TO_2[language]
    request = HttpRequest()
    request.META['HTTP_HOST'] = Site.objects.get_by_language(language).domain
    request.LANGUAGE_CODE = language
    request.LANGUAGE_CODE_ISO3 = settings.LANGUAGES_2_TO_3[language]
    request.API_CLIENT_IS_WEBSITE = False
    return request


def get_site_by_language(language):
    return Site.objects.get_by_language(language)


def get_site_by_current_language():
    return get_site_by_language(get_language())
