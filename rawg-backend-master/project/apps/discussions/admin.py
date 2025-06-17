from django.contrib import admin

from apps.discussions import models
from apps.utils.admin import CompareVersionAdmin


@admin.register(models.Discussion)
class DiscussionAdmin(CompareVersionAdmin):
    list_display = ('id', 'user', 'game', 'title', 'comments_count', 'created', 'hidden', 'is_zen')
    list_display_links = ('id', 'user', 'game', 'title', 'comments_count', 'created', 'hidden')
    raw_id_fields = ('user', 'game')
    readonly_fields = (
        'language', 'language_detection', 'text_safe', 'text_bare', 'text_preview', 'text_attachments',
        'comments_count', 'comments_parent_count'
    )
    list_editable = ('is_zen',)
    list_filter = ('hidden', 'is_zen')
