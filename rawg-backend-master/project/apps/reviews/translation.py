from modeltranslation.translator import TranslationOptions, register

from apps.reviews.models import Reaction


@register(Reaction)
class ReactionTranslationOptions(TranslationOptions):
    fields = ('title',)
