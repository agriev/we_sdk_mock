from adminsortable2.admin import SortableInlineAdminMixin
from django.contrib import admin
from django.http import HttpResponseRedirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from modeltranslation.admin import TranslationAdmin

from apps.games.models import Game
from apps.stories import forms, models
from apps.utils.admin import get_preview
from apps.utils.adminsortable2 import SortableAdminMixin


class GameStoryInline(SortableInlineAdminMixin, admin.TabularInline):
    model = models.GameStory
    fields = ('order', 'game', 'youtube_link', 'clip_link', 'is_error', 'hidden')
    readonly_fields = ('clip_link', 'is_error')
    autocomplete_fields = ('game',)
    extra = 0
    form = forms.GameStoryInlineAdminForm

    def get_field_queryset(self, db, db_field, request):
        if db_field.name == 'game':
            return Game.objects.only('id', 'name')
        return super().get_field_queryset(db, db_field, request)

    def clip_link(self, obj):
        if not obj.clip:
            return ''
        img = mark_safe(get_preview(obj.clip.preview, 150))
        return mark_safe(f'<a href="{obj.clip.clip.url}" target="_blank">{img}</a>')


@admin.register(models.Story)
class StoryAdmin(SortableAdminMixin, TranslationAdmin):
    list_display = (
        'id', 'name', 'slug', 'custom_background', 'preview', 'hidden', 'is_ready', 'use_for_partners', 'download'
    )
    list_display_links = ('id', 'name', 'slug', 'preview')
    list_editable = ('use_for_partners',)
    search_fields = ('slug',)
    readonly_fields = ('is_ready', 'background', 'slug', 'get_absolute_url', 'first', 'download')
    inlines = (GameStoryInline,)

    def preview(self, instance):
        return mark_safe(get_preview(instance.background, 150))

    def download(self, instance):
        if not instance.pk:
            return ''
        return mark_safe(format_html(
            '<a class="button" href="{}">Download</a>',
            reverse('admin:story-download', args=[instance.pk]),
        ))

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:story_id>/download/',
                self.admin_site.admin_view(self.process_download),
                name='story-download',
            ),
        ]
        return custom_urls + urls

    def process_download(self, request, story_id, *args, **kwargs):
        story = self.get_object(request, story_id)
        if request.method != 'POST':
            form = forms.DownloadAdminForm()
        else:
            form = forms.DownloadAdminForm(request.POST)
            if form.is_valid():
                form.save(story, request.user)
                self.message_user(request, 'The download link will be send to the #stories Slack channel')
                return HttpResponseRedirect(reverse(
                    'admin:stories_story_change',
                    args=[story.pk],
                    current_app=self.admin_site.name,
                ))
        context = self.admin_site.each_context(request)
        context['opts'] = self.model._meta
        context['form'] = form
        context['has_view_permission'] = True
        context['original'] = story.name
        context['title'] = f'Download Story {story.name}'
        context['submit_button'] = 'Run Generation'
        return TemplateResponse(request, 'admin/action.html', context)

    # def get_queryset(self, request):
    #     qs = super().get_queryset(request)
    #     if request.resolver_match.url_name.endswith('_change'):
    #         return qs.prefetch_related(
    #             Prefetch('game_stories__game', queryset=Game.objects.only('id', 'name'))
    #         )
    #     return qs


@admin.register(models.GameStory)
class GameStoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'game', 'story', 'clip', 'hidden', 'is_error')
    list_display_links = list_display
    raw_id_fields = ('game', 'story', 'clip')


@admin.register(models.Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ('id', 'game', 'youtube_id', 'video')
    list_display_links = list_display
    autocomplete_fields = ('game',)


@admin.register(models.Clip)
class ClipAdmin(admin.ModelAdmin):
    list_display = ('id', 'game', 'clip', 'preview_crop')
    list_display_links = list_display
    raw_id_fields = ('video', 'game')

    def lookup_allowed(self, lookup, value):
        if lookup in ['game__slug']:
            return True
        return super().lookup_allowed(lookup, value)

    def preview_crop(self, instance):
        return mark_safe(get_preview(instance.preview, 150))
    preview_crop.__name__ = 'Preview'


@admin.register(models.UserGameStory)
class UserGameStoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'game_story')
    list_display_links = list_display
    raw_id_fields = ('user', 'game_story')


@admin.register(models.UserStory)
class UserStoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'story')
    list_display_links = list_display
    raw_id_fields = ('user', 'story')
