from modeltranslation.translator import TranslationOptions, register

from apps.games.models import (
    Developer, ESRBRating, Game, GamePlatform, GameStore, Genre, Platform, PlatformParent, Publisher, Store,
)


@register(Game)
class GameTranslationOptions(TranslationOptions):
    fields = ('name', 'description', 'description_short')


@register(Developer)
class DeveloperTranslationOptions(TranslationOptions):
    fields = ('description',)


@register(Publisher)
class PublisherTranslationOptions(TranslationOptions):
    fields = ('description',)


@register(Genre)
class GenreTranslationOptions(TranslationOptions):
    fields = ('name', 'description')


@register(Store)
class StoreTranslationOptions(TranslationOptions):
    fields = ('description',)


@register(PlatformParent)
class PlatformParentTranslationOptions(TranslationOptions):
    fields = ('description',)


@register(Platform)
class PlatformTranslationOptions(TranslationOptions):
    fields = ('description',)


@register(ESRBRating)
class ESRBRatingTranslationOptions(TranslationOptions):
    fields = ('name', 'description')


@register(GameStore)
class GameStoreTranslationOptions(TranslationOptions):
    fields = ('url',)


@register(GamePlatform)
class GamePlatformTranslationOptions(TranslationOptions):
    fields = ('requirements',)
