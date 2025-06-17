from modeltranslation.translator import TranslationOptions, register

from apps.common.models import CatalogFilter, List


@register(CatalogFilter)
class CatalogFilterTranslationOptions(TranslationOptions):
    fields = ('name', 'title', 'description')


@register(List)
class ListTranslationOptions(TranslationOptions):
    fields = ('name', 'title', 'description')
