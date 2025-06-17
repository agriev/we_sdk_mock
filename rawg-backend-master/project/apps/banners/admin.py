from django.contrib import admin
from modeltranslation.admin import TranslationAdmin

from apps.banners import models


@admin.register(models.Banner)
class BannerAdmin(TranslationAdmin):
    list_display = ('id', 'field_text', 'field_url', 'field_url_text', 'created', 'active')
    list_display_links = list_display

    def field_text(self, obj):
        return obj.text or obj.text_ru

    def field_url(self, obj):
        return obj.url or obj.url_ru

    def field_url_text(self, obj):
        return obj.url_text or obj.url_text_ru
