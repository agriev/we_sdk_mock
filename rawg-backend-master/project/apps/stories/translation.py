from modeltranslation.translator import TranslationOptions, register

from apps.stories.models import Story


@register(Story)
class StoryTranslationOptions(TranslationOptions):
    fields = ('name',)
