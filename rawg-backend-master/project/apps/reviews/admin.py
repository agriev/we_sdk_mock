from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db.models import Prefetch
from modeltranslation.admin import TranslationAdmin

from apps.reviews import models
from apps.utils.admin import CompareVersionAdmin


@admin.register(models.Reaction)
class ReactionAdmin(TranslationAdmin):
    list_display = ('id', 'title', 'positive')
    list_display_links = list_display


@admin.register(models.Review)
class ReviewAdmin(CompareVersionAdmin):
    list_display = ('id', 'user', 'game', 'rating', 'comments_count', 'created', 'is_text', 'hidden', 'is_zen')
    list_display_links = ('id', 'user', 'game', 'rating', 'comments_count', 'created', 'is_text')
    raw_id_fields = ('user', 'game')
    readonly_fields = (
        'language', 'language_detection', 'text_safe', 'text_bare', 'text_preview', 'text_previews',
        'text_attachments', 'comments_count', 'comments_parent_count'
    )
    search_fields = ('user__username', 'user__email')
    list_editable = ('is_zen',)
    list_filter = ('is_text', 'hidden', 'is_zen')

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related(
            Prefetch('user', queryset=get_user_model().objects.defer_all())
        )


@admin.register(models.Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'review', 'added')
    list_display_links = list_display
    raw_id_fields = ('user', 'review')


@admin.register(models.Versus)
class VersusAdmin(admin.ModelAdmin):
    list_display = ('id', 'game', 'review_first', 'review_first_lang', 'review_second', 'review_second_lang')
    list_display_links = list_display
    raw_id_fields = ('game', 'review_first', 'review_second')

    def review_first_lang(self, instance):
        return instance.review_first.language

    def review_second_lang(self, instance):
        return instance.review_second.language


@admin.register(models.EditorialReview)
class EditorialReviewAdmin(CompareVersionAdmin):
    list_display = ('id', 'user', 'game', 'rating', 'created')
    list_display_links = list_display
    raw_id_fields = ('user', 'game')
