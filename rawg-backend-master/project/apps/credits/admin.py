from django.contrib import admin
from modeltranslation.admin import TranslationAdmin

from apps.credits import forms, models
from apps.utils.actions import merge_elements
from apps.utils.admin import CompareVersionAdmin
from apps.utils.adminsortable2 import SortableAdminMixin


class GamePersonInline(admin.TabularInline):
    model = models.GamePerson
    fields = ('game', 'position')
    raw_id_fields = ('game',)
    extra = 0


@admin.register(models.Person)
class PersonAdmin(TranslationAdmin):
    list_display = (
        'id', 'visible_name', 'slug', 'link', 'wikibase_id', 'games_count', 'games_added', 'on_main', 'hidden'
    )
    list_display_links = ('id', 'visible_name', 'slug', 'link', 'wikibase_id', 'games_count')
    list_editable = ('on_main',)
    list_filter = list_editable
    search_fields = ('id', 'name', 'display_name', 'link', 'wikibase_id')
    readonly_fields = (
        'name', 'slug', 'positions', 'link', 'wikibase_id', 'description_wiki', 'auto_description', 'image_wiki',
        'games_count', 'games_added', 'reviews_count', 'rating', 'rating_top', 'statistics', 'image_background',
    )
    inlines = (GamePersonInline,)
    actions = (merge_elements,)
    form = forms.PersonAdminForm

    def save_model(self, request, obj, form, change):
        if not obj.name and obj.visible_name:
            obj.name = obj.visible_name
        super().save_model(request, obj, form, change)


@admin.register(models.Position)
class PositionAdmin(SortableAdminMixin, TranslationAdmin):
    list_display = ('id', 'name_en', 'name_ru', 'name_ru_genitive', 'slug', 'wikibase_id')
    list_display_links = list_display
    search_fields = list_display


@admin.register(models.GamePerson)
class GamePersonAdmin(CompareVersionAdmin):
    list_display = ('id', 'game', 'person', 'position', 'hidden')
    list_display_links = list_display
    search_fields = ('id', 'game__name', 'person__name', 'position__name')
    raw_id_fields = ('game', 'person', 'position')
