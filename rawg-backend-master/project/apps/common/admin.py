from django.contrib import admin
from django.contrib.admin.utils import quote
from django.db.models import Q
from django.shortcuts import redirect
from django.urls import path, reverse
from django.utils.functional import cached_property
from django.utils.safestring import mark_safe
from modeltranslation.admin import TranslationAdmin
from rangefilter.filter import DateRangeFilter
from reversion.models import Revision, Version

from apps.common import models
from apps.games.cache import GameEditingContentTypes
from apps.utils.adminsortable2 import SortableAdminMixin
from apps.utils.api import int_or_none
from apps.utils.exceptions import Found


@admin.register(models.List)
class ListAdmin(SortableAdminMixin, TranslationAdmin):
    list_display = ('id', 'name', 'title', 'content_type')
    list_display_links = list_display

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(models.CatalogFilter)
class CatalogFilterAdmin(TranslationAdmin):
    list_display = (
        'id', 'platform', 'platformparent', 'genre', 'store', 'tag', 'developer', 'publisher', 'year', 'name'
    )
    list_display_links = list_display
    search_fields = list_display
    raw_id_fields = ('platform', 'platformparent', 'genre', 'store', 'tag', 'developer', 'publisher')

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('platform', 'genre')


class SeoLinkShowInline(admin.TabularInline):
    model = models.SeoLinkShow
    fields = ('seo_link', 'on_uri', 'created', 'ip', 'user_agent')
    readonly_fields = fields
    extra = 0

    def has_add_permission(self, request, obj=None):
        return False


class SeoLinkCrawlInline(admin.TabularInline):
    model = models.SeoLinkCrawl
    fields = ('seo_link', 'uri', 'created', 'ip', 'user_agent')
    readonly_fields = fields
    extra = 0

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(models.SeoLink)
class SeoLinkAdmin(admin.ModelAdmin):
    list_display = ('id', 'uri', 'name', 'shows_count', 'cycles_count', 'crawls_count', 'hidden')
    list_display_links = ('uri', 'name')
    list_editable = ('hidden',)
    readonly_fields = ('created', 'shows_count', 'cycles_count', 'crawls_count')
    search_fields = ('uri', 'name')
    inlines = (SeoLinkShowInline, SeoLinkCrawlInline)


@admin.register(models.SeoLinkShow)
class SeoLinkShowAdmin(admin.ModelAdmin):
    list_display = ('seo_link', 'on_uri', 'created', 'ip', 'user_agent')
    list_display_links = list_display
    readonly_fields = list_display
    search_fields = ('on_uri', 'ip', 'user_agent')

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(models.SeoLinkCrawl)
class SeoLinkCrawlAdmin(admin.ModelAdmin):
    list_display = ('seo_link', 'uri', 'created', 'ip', 'user_agent')
    list_display_links = list_display
    readonly_fields = list_display
    search_fields = ('uri', 'ip', 'user_agent')

    def has_add_permission(self, request, obj=None):
        return False


class VersionAdminInline(admin.TabularInline):
    model = Version
    fields = ('content_type', 'object_id', 'preview')
    readonly_fields = fields
    can_delete = False
    ordering = ('content_type',)
    extra = 0

    def preview(self, instance):
        opts = instance._model._meta
        href = reverse(
            'admin:{}_{}_history'.format(opts.app_label, opts.model_name),
            args=(quote(instance.object_id),),
        )
        return mark_safe('<a href="{}">View history and compare</a>'.format(href))


class RevisionExcludeFilter(admin.SimpleListFilter):
    title = 'Exclude groups'
    parameter_name = 'exclude_groups'
    db_editors_id = 1
    community_editors_id = 4

    def lookups(self, request, model_admin):
        return (
            (1, 'DB editors'),
            (2, 'Community editors'),
            (3, 'DB editors & Community editors'),
            (4, 'Is staff'),
        )

    def queryset(self, request, queryset):
        val = int_or_none(self.value())
        if val:
            if val == 4:
                queryset = queryset.exclude(user__is_staff=True)
            else:
                if val in (1, 3):
                    queryset = queryset.exclude(user__groups__id=self.db_editors_id)
                if val in (2, 3):
                    queryset = queryset.exclude(user__groups__id=self.community_editors_id)
        return queryset


class RevisionExternalFilter(admin.SimpleListFilter):
    title = 'External'
    parameter_name = 'external'

    def lookups(self, request, model_admin):
        return (
            (1, 'Yes'),
        )

    def queryset(self, request, queryset):
        val = self.value()
        if val:
            queryset = queryset.exclude(user_id=None).filter(
                Q(comment__startswith='Changed by') | Q(comment__startswith='Created by'),
            )
        return queryset


class RevisionAdmin(admin.ModelAdmin):
    list_display = ('date_created', 'user', 'comment', '__str__', 'link')  # , 'versions', 'commit_diff'
    date_hierarchy = 'date_created'
    ordering = ('-date_created',)
    search_fields = ('user__email', 'user__username', 'comment')
    inlines = (VersionAdminInline,)
    raw_id_fields = ('user',)
    actions = None
    list_filter = (
        'user__groups__name', RevisionExcludeFilter, RevisionExternalFilter, ('date_created', DateRangeFilter)
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.prefetch_related('version_set').select_related('user')
        return qs

    def changelist_view(self, request, extra_context=None):
        response = super().changelist_view(request, extra_context)
        self.add_links(response.context_data['cl'].result_list)
        return response

    def add_links(self, qs):
        prefetch = {}
        for reversion in qs:
            if reversion.comment.lower().startswith('merged'):
                continue
            try:
                # find by a game content type
                for version in reversion.version_set.all():
                    if version.content_type_id == self.content_types['game']:
                        reversion.game_link = version.object_id
                        raise Found
                # find by other content types
                for version in reversion.version_set.all():
                    if version.content_type_id in self.content_types['other']:
                        model = self.content_types['other'][version.content_type_id]
                        prefetch.setdefault(model, []).append(version.object_id)
                        reversion.game_link = (model, int(version.object_id))
                        raise Found
            except Found:
                pass
        prefetch_links = {}
        for model, values in prefetch.items():
            for pk, game_id in model.objects.filter(id__in=values).values_list('id', 'game_id'):
                prefetch_links.setdefault(model, {})[pk] = game_id
        for reversion in qs:
            if getattr(reversion, 'game_link', None) and type(reversion.game_link) is tuple:
                try:
                    reversion.game_link = prefetch_links[reversion.game_link[0]].get(reversion.game_link[1])
                except KeyError:
                    reversion.game_link = None

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def link(self, instance):
        if not getattr(instance, 'game_link', None):
            return ''
        return mark_safe('<a href="{}" target="_blank">View Game</a>'.format(
            reverse('admin:view_on_site', args=(self.content_types['game'], instance.game_link)),
        ))

    def versions(self, instance):
        links = ''
        for version in instance.version_set.all():
            app = version.content_type.app_label
            model = version.content_type.model
            if app == 'games' and model in ('screenshot', 'movie'):
                model = 'game'
                try:
                    object_id = version.object.game_id
                except AttributeError:
                    object_id = None
            else:
                object_id = version.object_id

            reverse_url = 'admin:{}_{}_history'.format(app, model)
            if not object_id:
                history_url = None
            else:
                history_url = '<a href="{}" target="_blank">{} history</a><br/>'.format(
                    reverse(
                        reverse_url,
                        kwargs={"object_id": object_id},
                    ),
                    version,
                )
                if history_url not in links:
                    links += history_url

        return mark_safe(links)

    def commit_diff(self, instance):
        links = ''
        for version in instance.version_set.all():
            if version.content_type.model in ('screenshot', 'movie') or version.content_type.app_label != 'games':
                link = ''

            elif 'created' in version.revision.comment.lower():
                link = ''

            else:
                link = '<a href="{}">View {} diff</a><br/>'.format(
                    reverse(
                        'admin:reversion_VersionProxy',
                        args=(version.content_type.id, version.object_id, version.id),
                    ),
                    version.content_type,
                )

            links += link

        return mark_safe(links)

    def get_urls(self):
        urls = super().get_urls()
        my_urls = [
            path(
                'version_proxy/<int:ct_type>/<int:obj_id>/<int:version_id2>',
                self.version_proxy_view,
                name="reversion_VersionProxy",
            ),
        ]
        return my_urls + urls

    # def name_or_slug(self):

    def version_proxy_view(self, *args, **kwargs):
        """Proxy View for diff compare"""
        prev_version = Version.objects.filter(
            content_type=kwargs.get('ct_type'),
            object_id=kwargs.get('obj_id'),
            pk__lt=kwargs.get('version_id2'),
        ).first()

        if prev_version:
            reverse_url = 'admin:{}_{}_compare'.format(
                prev_version.content_type.app_label,
                prev_version.content_type.model,
            )

            compare_url = '{}?version_id2={}&version_id1={}'.format(
                reverse(
                    reverse_url,
                    args=(kwargs.get('obj_id'), ),
                ),
                kwargs.get('version_id2'),
                prev_version.id,
            )
            return redirect(compare_url)

        else:
            return redirect(reverse('admin:index'))

    @cached_property
    def content_types(self):
        from apps.games.models import Addition, Game, GamePlatform, GameStore, ScreenShot
        from apps.credits.models import GamePerson
        types = GameEditingContentTypes().get()
        return {
            'game': types[Game].id,
            'other': {
                types[Addition].id: Addition,
                types[GamePerson].id: GamePerson,
                types[GamePlatform].id: GamePlatform,
                types[GameStore].id: GameStore,
                types[ScreenShot].id: ScreenShot,
            },
        }


class VersionAdmin(admin.ModelAdmin):
    list_display = ('object_repr', 'object_id', 'content_type', 'view')
    list_filter = ('content_type',)
    search_fields = ('object_repr', 'serialized_data')
    raw_id_fields = ('revision',)

    def view(self, instance):
        opts = instance._model._meta
        href = reverse(
            'admin:{}_{}_history'.format(opts.app_label, opts.model_name),
            args=(quote(instance.object_id),),
        )
        return mark_safe('<a href="{}">View history and compare</a>'.format(href))

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(Revision, RevisionAdmin)
admin.site.register(Version, VersionAdmin)
