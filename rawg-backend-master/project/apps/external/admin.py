from django.conf import settings
from django.contrib import admin
from django.utils.safestring import mark_safe

from apps.external import models


@admin.register(models.Reddit)
class RedditAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'picture', 'created', 'game')
    list_display_links = ('id', 'name', 'created', 'game')
    search_fields = ('game__name', 'name')
    raw_id_fields = ('game',)

    def picture(self, instance):
        return mark_safe('<img src="{}" height="100">'.format(instance.image)) if instance.image else ''


@admin.register(models.Twitch)
class TwitchAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'picture', 'view_count', 'game')
    list_display_links = ('id', 'name', 'view_count', 'game')
    search_fields = ('game__name', 'name')
    raw_id_fields = ('game',)

    def picture(self, instance):
        if not instance.thumbnail:
            return ''
        image = instance.thumbnail.replace('%{width}', '150').replace('%{height}', '100')
        return mark_safe('<img src="{}" width="150" height="100">'.format(image))


@admin.register(models.Youtube)
class YoutubeAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'picture', 'view_count', 'game')
    list_display_links = ('id', 'name', 'view_count', 'game')
    search_fields = ('game__name', 'name')
    raw_id_fields = ('game',)

    def picture(self, instance):
        if not instance.thumbnails:
            return ''
        return mark_safe(
            '<img src="{url}" width="{width}" height="{height}">'.format(**instance.thumbnails['default'])
        )


@admin.register(models.Imgur)
class ImgurAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'picture', 'view_count', 'game')
    list_display_links = ('id', 'name', 'view_count', 'game')
    search_fields = ('game__name', 'name')
    raw_id_fields = ('game',)

    def picture(self, instance):
        return mark_safe('<img src="{}" height="160" width="160">'
                         .format(settings.IMGUR_THUMB_URL.format(instance.image_id)))


@admin.register(models.WikiData)
class WikiDataAdmin(admin.ModelAdmin):
    list_display = ('id', 'game')
    list_display_links = list_display
    search_fields = ('id', 'game__name')
    raw_id_fields = ('game',)
