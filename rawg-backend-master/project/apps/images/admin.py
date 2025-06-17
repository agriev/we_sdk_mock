from django.conf import settings
from django.contrib import admin
from django.utils.safestring import mark_safe

from apps.images import models


@admin.register(models.UserImage)
class UserImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', '_image', 'created')
    list_display_links = list_display
    raw_id_fields = ('user',)

    def _image(self, instance):
        return mark_safe('<img src="{}{}" width="150">'.format(settings.MEDIA_URL, instance.image)
                         if instance.image else '')
