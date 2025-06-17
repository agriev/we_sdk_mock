from modeltranslation.translator import TranslationOptions, register

from apps.credits.models import Person, Position


@register(Position)
class PositionTranslationOptions(TranslationOptions):
    fields = ('name',)


@register(Person)
class PersonTranslationOptions(TranslationOptions):
    fields = ('display_name', 'description', 'auto_description')
