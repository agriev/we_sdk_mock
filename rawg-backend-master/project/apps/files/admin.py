from django.contrib import admin
from modeltranslation.admin import TranslationAdmin

from apps.files import models


@admin.register(models.CheatCode)
class CheatCodeAdmin(admin.ModelAdmin):
    list_display = ('id', 'game', 'category', 'created')
    list_display_links = list_display
    raw_id_fields = ('game',)


@admin.register(models.File)
class FileAdmin(TranslationAdmin):
    list_display = ('id', 'game', 'name', 'category', 'windows', 'languages', 'created')
    list_display_links = list_display
    raw_id_fields = ('game',)


@admin.register(models.SoftwareCategory)
class SoftwareCategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'slug', 'parent')
    list_display_links = list_display


@admin.register(models.Software)
class SoftwareAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'version', 'systems')
    list_display_links = list_display


@admin.register(models.SoftwareFile)
class SoftwareFileAdmin(admin.ModelAdmin):
    list_display = ('id', 'software', 'name', 'created')
    list_display_links = list_display
    raw_id_fields = ('software',)
