from modeltranslation.translator import TranslationOptions, register

from apps.banners.models import Banner


@register(Banner)
class BannerTranslationOptions(TranslationOptions):
    fields = ('text', 'url', 'url_text')
