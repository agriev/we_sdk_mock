from collections import OrderedDict

from django.contrib import admin
from django.contrib.admin.views.autocomplete import AutocompleteJsonView
from django.db import transaction
from django.db.models import Q
from django.forms import BaseInlineFormSet, CharField, ValidationError, inlineformset_factory
from django.urls import path
from django.utils.safestring import mark_safe
from modeltranslation.admin import TranslationAdmin, TranslationStackedInline, TranslationTabularInline
from rangefilter.filter import DateTimeRangeFilter

from apps.ad.forms import AdFoxCompanyParameterForm
from apps.ad.models import AdFoxCompanyParameter
from apps.games import actions, forms, models
from apps.merger.models import DeletedGame
from apps.payments.models import Payment, PaymentProject
from apps.utils.admin import AjaxPaginator, ClearCacheMixin, CompareVersionAdmin, MergeAdminMixin, get_preview
from apps.utils.adminsortable2 import SortableAdminMixin
from .filters import PaymentSystemSetupListFilter, PlayableGamesListFilter


class GameItemBase(MergeAdminMixin, CompareVersionAdmin):
    list_display = ['id', 'name', 'slug', 'added', 'games_count', 'games_added', 'locked', 'hidden']
    list_display_links = ('id', 'name', 'slug', 'added')
    list_editable = ['hidden']
    readonly_fields = ['slug', 'synonyms', 'games_count', 'games_added', 'top_games', 'image_background']
    search_fields = ('name', 'slug')


@admin.register(models.Genre)
class GenreAdmin(SortableAdminMixin, GameItemBase, TranslationAdmin):
    pass


@admin.register(models.Publisher)
class PublisherAdmin(GameItemBase, TranslationAdmin):
    pass


@admin.register(models.Developer)
class DeveloperAdmin(GameItemBase, TranslationAdmin):
    pass


@admin.register(models.Tag)
class TagAdmin(GameItemBase):
    list_display = GameItemBase.list_display + ['white']
    list_editable = GameItemBase.list_editable + ['white']
    readonly_fields = GameItemBase.readonly_fields + ['language', 'language_detection']


@admin.register(models.Store)
class StoreAdmin(SortableAdminMixin, CompareVersionAdmin, TranslationAdmin):
    list_display = ('id', 'name', 'slug', 'platforms_list', 'domain', 'use_in_sync')
    list_display_links = list_display
    readonly_fields = ('platforms',)

    def platforms_list(self, instance):
        return ', '.join([p.name for p in instance.platforms.all()])


@admin.register(models.PlatformParent)
class PlatformParentAdmin(SortableAdminMixin, CompareVersionAdmin, TranslationAdmin):
    list_display = ('id', 'name', 'slug')
    list_display_links = list_display


@admin.register(models.Platform)
class PlatformAdmin(SortableAdminMixin, CompareVersionAdmin, TranslationAdmin):
    list_display = ('id', 'name', 'slug', 'parent', 'games_count', 'games_added', 'year_start', 'year_end')
    list_display_links = list_display
    readonly_fields = ('games_count', 'top_games', 'image_background')

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('parent')


@admin.register(models.GamePlatformMetacritic)
class GamePlatformMetacriticAdmin(admin.ModelAdmin):
    list_display = ('id', 'game', 'platform', 'metascore')
    list_display_links = list_display
    raw_id_fields = ('game', 'platform')


@admin.register(models.ScreenShot)
class ScreenShotAdmin(CompareVersionAdmin):
    list_display = ('id', 'game', 'hidden', '_image')
    list_display_links = list_display
    raw_id_fields = ('game',)

    def _image(self, instance):
        return mark_safe(get_preview(instance.visible_image, 150))


@admin.register(models.Movie)
class MovieAdmin(CompareVersionAdmin):
    list_display = ('id', 'game', 'store', 'name', '_image')
    list_display_links = list_display
    raw_id_fields = ('game',)

    def _image(self, instance):
        return mark_safe(get_preview(instance.preview, 150))


@admin.register(models.GamePlatform)
class GamePlatformAdmin(CompareVersionAdmin, TranslationAdmin):
    list_display = ('id', 'game', 'platform', 'released_at', 'tba')
    list_display_links = list_display
    raw_id_fields = ('game',)


@admin.register(models.GameStore)
class GameStoreAdmin(CompareVersionAdmin, TranslationAdmin):
    raw_id_fields = ('game',)


class GameStoreInline(TranslationTabularInline):
    model = models.GameStore
    readonly_fields = ('store_internal_id',)
    extra = 0


class GamePlatformInline(TranslationStackedInline):
    model = models.GamePlatform
    fields = ('platform', 'released_at', 'minimum_en', 'recommended_en', 'minimum_ru', 'recommended_ru', 'tba')
    form = forms.GamePlatformForm
    extra = 0


class ScreenShotInline(admin.TabularInline):
    model = models.ScreenShot
    fields = ('preview', 'image', 'is_small', 'hidden')
    readonly_fields = ('preview',)
    extra = 0

    def preview(self, instance):
        return mark_safe(get_preview(instance.visible_image, 150))


class MovieInline(admin.TabularInline):
    model = models.Movie
    fields = ('game', 'store', 'name', 'image')
    readonly_fields = ('image',)
    extra = 0

    def image(self, instance):
        return mark_safe(get_preview(instance.preview, 150))


class AdditionInline(admin.TabularInline):
    model = models.Addition
    fk_name = 'parent_game'
    extra = 0
    autocomplete_fields = ('game',)


class GamePlatformMetacriticInline(admin.TabularInline):
    model = models.GamePlatformMetacritic
    extra = 0
    autocomplete_fields = ('game',)
    readonly_fields = ('metascore',)


class BaseAdFoxCompanyParameterFormset(BaseInlineFormSet):
    def clean(self):
        forms_companies = set(form.cleaned_data['company'] for form in self.forms if not form.cleaned_data['DELETE'])
        available_companies = set(company[0] for company in AdFoxCompanyParameter.COMPANY_CHOICES)
        if forms_companies and forms_companies != available_companies:
            raise ValidationError(
                'У игры должен быть хотя бы один параметр для каждой из компаний,'
                'либо параметры должны отсутствовать вовсе'
            )
        return super(BaseAdFoxCompanyParameterFormset, self).clean()


AdFoxCompanyParameterFormset = inlineformset_factory(
    models.Game, AdFoxCompanyParameter, fields=('company', 'name', 'value'), formset=BaseAdFoxCompanyParameterFormset,
)


class AdFoxCompanyParameterInline(admin.TabularInline):
    model = AdFoxCompanyParameter
    extra = 0
    form = AdFoxCompanyParameterForm
    formset = AdFoxCompanyParameterFormset


class PaymentInline(admin.TabularInline):
    model = PaymentProject
    fields = ('id', 'secret_key', 'payment_system_name')
    extra = len(Payment.PAYMENT_SYSTEMS)
    max_num = extra


@admin.register(models.Game)
class GameAdmin(CompareVersionAdmin, TranslationAdmin):
    list_display = ('id', 'name', 'platforms_list', 'released', 'tba', 'added', 'playtime')
    list_display_links = list_display
    search_fields = ('id', 'name_en__contains', 'name_ru__contains')
    list_filter = (
        PlayableGamesListFilter, PaymentSystemSetupListFilter, 'promo', 'platforms', 'stores', 'is_complicated_name',
        'twitch_not_found', 'wikipedia_not_found',
    )
    readonly_fields = (
        'slug', 'alternative_names', 'synonyms', 'image_background', 'image_background_additional',
        'playtime', 'twitch_id', 'twitch_not_found', 'twitch_counts', 'reddit_name',
        'reddit_description', 'reddit_logo', 'reddit_count', 'wikibase_id', 'wikipedia_not_found',
        'youtube_counts', 'imgur_count', 'discussions_count', 'screenshots_count', 'movies_count',
        'collections_count', 'persons_count', 'achievements_count', 'parent_achievements_count_all',
        'parent_achievements_counts', 'added', 'added_by_status', 'users', 'charts',
        'import_collection', 'rating', 'rating_top', 'ratings', 'reactions', 'metacritic', 'created', 'updated',
        'suggestions', 'suggestions_count', 'reviews_text_count', 'ratings_count',
        'parents_count', 'additions_count', 'game_series_count', 'secret_key'
    )
    fieldsets_name = ['name_en', 'name_ru', 'slug', 'is_complicated_name', 'alternative_names', 'synonyms']
    fieldsets_images = ['image', 'image_background', 'image_background_additional']
    fieldsets = (
        ('Name', {'fields': fieldsets_name}),
        ('Description', {'fields': (
            'description', 'description_en_is_plain_text', 'description_ru_is_plain_text', 'description_is_protected',
            'description_short'
        )}),
        ('Images', {'fields': fieldsets_images}),
        (
            'Настройки запускаемой игры',
            {
                'fields': (
                    'can_play', 'iframe', 'secret_key', 'webhook_url', 'play_on_desktop', 'play_on_mobile',
                    'desktop_auth_delay', 'mobile_auth_delay', 'seamless_auth', 'alternative_fullscreen',
                    'exit_button_position', 'local_client'
                )
            }
        ),
        (
            'Data', {'fields': (
                'released', 'tba', 'esrb_rating', 'promo', 'created', 'updated', 'playtime', 'reviews_text_count',
                'ratings_count', 'discussions_count', 'screenshots_count', 'movies_count', 'collections_count',
                'persons_count', 'achievements_count', 'parent_achievements_count_all', 'parent_achievements_counts',
                'added', 'added_by_status', 'users', 'charts', 'suggestions', 'suggestions_count',
                'parents_count', 'additions_count', 'game_series_count',
            )},
        ),
        ('Related', {'fields': ('developers', 'publishers', 'genres', 'tags', 'game_series')}),
        (
            'External', {'fields': (
                'display_external',
                'website', 'reddit_url', 'reddit_name', 'reddit_description', 'reddit_logo', 'reddit_count',
                'twitch_name', 'twitch_id', 'twitch_not_found', 'twitch_counts', 'youtube_name', 'youtube_counts',
                'imgur_name', 'imgur_count', 'wikipedia_name', 'wikibase_id', 'wikipedia_not_found',
                'import_collection', 'metacritic', 'metacritic_url',
            )},
        ),
    )
    inlines = (
        GameStoreInline, GamePlatformInline, MovieInline, ScreenShotInline, AdditionInline,
        GamePlatformMetacriticInline, AdFoxCompanyParameterInline, PaymentInline
    )
    actions = CompareVersionAdmin.actions + [actions.merge_games, actions.delete_selected_custom]
    form = forms.GameAdminForm
    synonyms = []
    alternative_names = []
    compare_exclude = readonly_fields
    autocomplete_fields = ('developers', 'publishers', 'genres', 'tags', 'game_series')

    def delete_model(self, request, obj):
        with transaction.atomic():
            DeletedGame.objects.create(game_name=obj.name)
            return super().delete_model(request, obj)

    def get_actions(self, request):
        result = super().get_actions(request)
        if 'delete_selected' in result:
            del result['delete_selected']
        actions_list = OrderedDict()
        for name, (func, name, desc) in result.items():
            if name == 'delete_selected_custom':
                name = 'delete_selected'
            actions_list[name] = (func, name, desc)
        return actions_list

    def has_delete_custom_permission(self, request):
        return request.user.has_perm('games.delete_games')

    def has_merge_permission(self, request):
        return request.user.has_perm('games.merge_games')

    def get_queryset(self, request):
        if request.resolver_match.url_name == 'games_game_change':
            return super().get_queryset(request).prefetch_related(
                'platforms', 'stores', 'genres', 'tags', 'developers', 'publishers', 'fox_parameters'
            )
        return super().get_queryset(request).prefetch_related('platforms')

    def get_list_display(self, request):
        if request.GET.get('promo'):
            self.list_editable = ('promo',)
            return self.list_display[0:4] + ('promo',)
        self.list_editable = ()
        return super().get_list_display(request)

    def get_changelist_form(self, request, **kwargs):
        return forms.GameAdminListForm

    def platforms_list(self, instance):
        return ', '.join([p.name for p in instance.platforms.all()])

    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        if obj:
            has_change = self.has_change_permission(request, obj)

            updated = self.fieldsets_name.copy()
            if has_change:
                if not obj.alternative_names:
                    obj.alternative_names = []
                synonyms_text = \
                    'Attention! This field is used by bot to merge games automatically. ' \
                    'Edit only if you know what you’re doing.'
                public_altnames_text = \
                    'This is safe Alternative Names field from game edit form. Feel free to edit.'
                for i, _ in enumerate(obj.synonyms + ['']):
                    key = 'synonym{}'.format(i)
                    updated.append(key)
                    self.synonyms.append(key)
                    self.form.declared_fields.update({
                        key: CharField(label='Synonym {}'.format(i), required=False, help_text=synonyms_text),
                    })
                for i, _ in enumerate(obj.alternative_names + ['']):
                    key = 'alternative_names{}'.format(i)
                    updated.append(key)
                    self.alternative_names.append(key)
                    self.form.declared_fields.update(
                        {
                            key: CharField(
                                label='Public Alternative name {}'.format(i),
                                required=False,
                                help_text=public_altnames_text
                            ),
                        }
                    )
            fieldsets[0][1]['fields'] = updated

            updated = self.fieldsets_images.copy()
            if has_change:
                updated = ['attachments'] + updated
            fieldsets[2][1]['fields'] = updated
        return fieldsets

    def save_model(self, request, obj, form, change):
        if self.has_change_permission(request, obj):
            if 'attachments' in form.cleaned_data:
                def on_commit():
                    for image in form.cleaned_data['attachments']:
                        models.ScreenShot.objects.create(image=image, game=obj)
                    obj.set_background_image(True)
                transaction.on_commit(on_commit)
            if 'synonym0' in form.cleaned_data:
                obj.synonyms = []
                for key in self.synonyms:
                    obj.add_synonym(form.cleaned_data[key])
            if 'alternative_names0' in form.cleaned_data:
                new_names = []
                for key in self.alternative_names:
                    name = form.cleaned_data[key]
                    if name != '':
                        new_names.append(name)
                obj.alternative_names = list(set(new_names))
        super().save_model(request, obj, form, change)

    def get_search_results(self, request, queryset, search_term):
        if request.GET.get('term'):
            args = Q(name_en__contains=search_term) | Q(name_ru__contains=search_term)
            if search_term.isdigit():
                args |= Q(id=search_term)
            qs = models.Game.objects.only('name').filter(args).order_by()
            qs.query.set_limits(None, AutocompleteJsonView.paginate_by / 2)
            return list(qs), False
        else:
            return super().get_search_results(request, queryset, search_term)

    def get_paginator(self, request, queryset, per_page, orphans=0, allow_empty_first_page=True):
        if request.GET.get('term'):
            return AjaxPaginator(queryset, per_page, orphans, allow_empty_first_page)
        return super().get_paginator(request, queryset, per_page, orphans, allow_empty_first_page)

    def get_urls(self):
        view = self.admin_site.admin_view(AutocompleteJsonView.as_view(model_admin=self))
        # can be used in related models as a filter in ModelAdmin
        # from admin_auto_filters.filters import AutocompleteFilterFactory
        # ...
        # list_filter = ('AutocompleteFilterFactory('Game', 'game', 'admin:game_related_filter_autocomplete'),)
        res = [path('related_filter_autocomplete/', view, name='game_related_filter_autocomplete')] + super().get_urls()
        return res


@admin.register(models.Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'name', 'creator', 'created', 'games_count', 'posts_count', 'on_main', 'is_zen', 'is_private'
    )
    list_display_links = ('id', 'name', 'creator', 'created', 'games_count', 'posts_count')
    search_fields = ('id', 'name')
    list_editable_default = ('on_main', 'is_zen', 'is_private')
    list_editable = list_editable_default
    list_filter = ('on_main', 'is_zen', 'is_private', 'promo')
    raw_id_fields = ('creator', 'game_background')
    readonly_fields = ('slug', 'language', 'language_detection')
    form = forms.CollectionAdminForm

    def get_list_display(self, request):
        if request.GET.get('promo'):
            self.list_editable = ('promo',)
            return self.list_display[0:4] + ('promo',)
        self.list_editable = self.list_editable_default
        return super().get_list_display(request)

    def get_changelist_form(self, request, **kwargs):
        return forms.CollectionAdminForm


@admin.register(models.CollectionFeed)
class CollectionFeedAdmin(admin.ModelAdmin):
    list_display = ('id', 'content_object', 'created')
    list_display_links = list_display
    raw_id_fields = ('collection', 'user')
    readonly_fields = ('language', 'language_detection', 'text_safe', 'text_bare', 'text_preview', 'text_attachments')


@admin.register(models.CollectionGame)
class CollectionGameAdmin(admin.ModelAdmin):
    list_display = ('id', 'collection', 'game', 'added')
    list_display_links = list_display
    raw_id_fields = ('collection', 'game')


@admin.register(models.CollectionOffer)
class CollectionOfferAdmin(admin.ModelAdmin):
    list_display = ('id', 'collection', 'game', 'creator', 'added', 'hidden')
    list_display_links = list_display


@admin.register(models.CollectionLike)
class CollectionLikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'collection', 'added')
    list_display_links = list_display
    raw_id_fields = ('user', 'collection')


@admin.register(models.Featured)
class FeaturedAdmin(ClearCacheMixin, SortableAdminMixin, CompareVersionAdmin):
    list_display = ('id', 'game')
    list_display_links = list_display
    autocomplete_fields = ('game',)


@admin.register(models.Recommended)
class RecommendedAdmin(FeaturedAdmin):
    list_display = ('id', 'game')
    list_display_links = list_display
    autocomplete_fields = ('game',)


@admin.register(models.Addition)
class AdditionAdmin(CompareVersionAdmin):
    list_display = ('id', 'game', 'parent_game', 'link_type')
    list_display_links = list_display
    autocomplete_fields = ('game', 'parent_game')


@admin.register(models.ESRBRating)
class ESRBRatingAdmin(TranslationAdmin):
    list_display = ('id', 'name', 'short_name', 'slug', 'hidden')
    list_display_links = list_display


@admin.register(models.MadWorldNews)
class MadWorldNews(admin.ModelAdmin):
    list_display = ('subject', 'board', 'created', 'modified', 'published', 'is_active', 'wr_id')
    list_filter = ('board', 'is_active', ('published', DateTimeRangeFilter), ('created', DateTimeRangeFilter),
                   ('modified', DateTimeRangeFilter))
    readonly_fields = ('wr_id', 'created', 'modified', 'published')
    fields = ('subject', 'board', 'content', 'wr_id', 'created', 'modified', 'published', 'is_active')
