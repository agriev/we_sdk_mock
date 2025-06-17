from modeltranslation.translator import TranslationOptions, register

from apps.files.models import File


@register(File)
class FileTranslationOptions(TranslationOptions):
    fields = ('description',)
