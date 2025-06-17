import csv
import logging
import typing

from admin_auto_filters.filters import AutocompleteFilterFactory
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DefaultUserAdmin
from django.contrib.messages import ERROR
from django.core.paginator import Paginator
from django.db.models import F, Prefetch, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.urls import reverse
from django.utils.safestring import mark_safe
from knbauth import api
from papi.exceptions import PAPIException, PAPIUserContactNotFoundError
from rangefilter.filter import DateRangeFilter
from rest_framework.authtoken.models import Token

from apps.games.models import Platform
from apps.users import filters, models
from apps.users.apps import UsersConfig

logger = logging.getLogger(__name__)


def get_pages(objects, page_size):
    paginator = Paginator(objects, page_size)
    for page_number in paginator.page_range:
        yield list(paginator.page(page_number))


def get_social_emails(gids: typing.List[str]) -> typing.Dict[str, typing.List[str]]:
    contacts = api.user.get_multi_social_emails(uids=gids)['contacts']
    return {contact['user_id']: contact['vk_emails'] for contact in contacts}


class BalanceInline(admin.StackedInline):
    model = models.Balance
    readonly_fields = ('user', 'bonuses')
    _superuser_readonly_fields = ('user',)

    def get_readonly_fields(self, request, obj=None):
        if request.user.is_superuser:
            return self._superuser_readonly_fields
        return super().get_readonly_fields(request, obj)

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(models.User)
class UserAdmin(DefaultUserAdmin):
    list_display = (
        'id', 'username', 'email', 'full_name', 'last_entered', 'date_joined', 'is_active', 'is_staff', 'is_superuser'
    )
    list_display_links = list_display
    search_fields = ('id', 'username', 'email', 'full_name')
    list_filter = (
        'is_active', 'is_staff', 'is_superuser', 'groups', 'source_language', filters.GameAccountFilter,
        filters.GameSuccessAccountFilter, filters.IsApiKeyFilter, 'api_group', ('date_joined', DateRangeFilter)
    )
    raw_id_fields = ('game_background',)
    ordering = ('-id',)
    readonly_fields = (
        'slug', 'last_sync_steam', 'last_sync_steam_fast', 'last_sync_xbox', 'last_sync_xbox_fast', 'last_sync_psn',
        'last_sync_psn_fast', 'last_sync_gog', 'last_sync_gog_fast', 'steam_id_uid', 'steam_id_confirm',
        'steam_id_confirm_date', 'steam_id_uid_first_confirm', 'gamer_tag_uid', 'gamer_tag_confirm',
        'gamer_tag_confirm_date', 'gamer_tag_uid_first_confirm', 'psn_online_id_confirm', 'psn_online_id_confirm_date',
        'psn_online_id_first_confirm', 'steam_games_playtime', 'bio_html', 'followers_count', 'following_count',
        'games_count', 'collections_count', 'collections_all_count', 'comments_count', 'reviews_count',
        'reviews_text_count', 'settings', 'referer', 'token_program', 'tokens', 'rated_games_percent',
        'source_language', 'api_dates', 'social_emails'
    )
    fieldsets = (
        ('Personal info', {'fields': (
            'full_name', 'username', 'email', 'social_emails', 'avatar', 'password', 'feedback_propose', 'slug',
            'bio', 'bio_html'
        )}),
        ('API', {'fields': (
            'api_key', 'api_email', 'api_url', 'api_description', 'api_group', 'api_group_changed', 'api_dates',
        )}),
        ('Games', {'fields': (
            'steam_id', 'steam_id_status', 'steam_id_date', 'steam_id_uid', 'last_sync_steam', 'last_sync_steam_fast',
            'steam_id_confirm', 'steam_id_confirm_date', 'steam_id_uid_first_confirm', 'steam_games_playtime',
            'gamer_tag', 'gamer_tag_status', 'gamer_tag_date', 'gamer_tag_uid', 'last_sync_xbox',
            'last_sync_xbox_fast', 'gamer_tag_confirm', 'gamer_tag_confirm_date', 'gamer_tag_uid_first_confirm',
            'psn_online_id', 'psn_online_id_status', 'psn_online_id_date', 'last_sync_psn', 'last_sync_psn_fast',
            'psn_online_id_confirm', 'psn_online_id_confirm_date', 'psn_online_id_first_confirm',
            'gog', 'gog_status', 'gog_date', 'last_sync_gog', 'last_sync_gog_fast',
            'raptr', 'raptr_status', 'raptr_date', 'game_background',
        )}),
        ('Important dates', {'fields': ('last_entered', 'last_login', 'date_joined')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Settings', {'fields': (
            'subscribe_mail_synchronization', 'subscribe_mail_reviews_invite', 'subscribe_mail_recommendations',
            'select_platform', 'all_languages', 'feed_chronological', 'settings',
        )}),
        ('Other', {'fields': (
            'source_language', 'referer', 'followers_count', 'following_count', 'games_count', 'collections_count',
            'collections_all_count', 'comments_count', 'reviews_count', 'reviews_text_count', 'token_program',
            'tokens', 'rated_games_percent',
        )}),
    )

    inlines = [BalanceInline]

    actions = ['export']

    def export(self, request, queryset):
        queryset = queryset.prefetch_related('games_played')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename=user-info.csv'
        csv_writer = csv.writer(response, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        try:
            rows = self._get_rows(queryset)
        except PAPIException as error:
            logger.error(
                f'Failed to get social email, error: {error} (gids: {list(queryset.values_list("gid", flat=Token))})'
            )
            return self.message_user(request, 'Failed to get data from the authentication system.', level=ERROR)
        csv_writer.writerows(rows)
        return response

    def _get_rows(self, users: typing.Iterable[models.User]) -> typing.List[typing.List[str]]:
        rows = [UsersConfig.ADMIN_EXPORT_USER_FIELDS + ['games', 'social_emails']]  # head of csv file

        for page_to_papi in get_pages(users, self.list_per_page):
            social_emails = get_social_emails([user.gid for user in page_to_papi if user.gid])

            for user in page_to_papi:
                row = [getattr(user, field) for field in UsersConfig.ADMIN_EXPORT_USER_FIELDS]
                row.append(','.join([game.name for game in user.games_played.all()]).strip(','))
                try:
                    row.append(','.join(social_emails[user.gid]))
                except KeyError:
                    pass
                rows.append(row)
        return rows

    def social_emails(self, instance: models.User) -> str:
        if not instance.gid:
            return '-'

        try:
            return ','.join(api.user.get_social_emails(uid=instance.gid)['vk_emails'])
        except PAPIUserContactNotFoundError:
            return '-'
        except (PAPIException, KeyError) as error:
            logger.error(f'Failed to get social email for user gid {instance.gid}, error: {error}')
            return '-'
    social_emails.short_description = 'Email_Additional'


@admin.register(models.UserGame)
class UserGameAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'game', 'platforms_list', 'status', 'created', 'added', 'last_played', 'is_imported')
    list_display_links = list_display
    raw_id_fields = ('user', 'game')
    readonly_fields = ('created', 'playtime', 'playtime_stores')

    _platform_field = 'name'

    def platforms_list(self, instance):
        return ', '.join([getattr(p, self._platform_field) for p in instance.platforms.all()])

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.prefetch_related(
            Prefetch('platforms', queryset=Platform.objects.only(self._platform_field)))


@admin.register(models.SubscriptionProgram)
class SubscriptionProgramAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'get_game_name')
    list_display_links = list_display
    autocomplete_fields = ('game',)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(game_name=F('game__name'))

    def get_game_name(self, obj):
        return obj.game_name
    get_game_name.short_description = 'Game'


@admin.register(models.Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'get_game_name', 'get_status')
    list_display_links = list_display
    list_filter = (
        'program__status',
        AutocompleteFilterFactory('Game', 'program__game', 'admin:game_related_filter_autocomplete'),
    )
    readonly_fields = ('get_user_link', 'get_game_link', 'get_program_link',)
    fields = readonly_fields
    actions = ('export_subscriptions',)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('program').annotate(game_name=F('program__game__name'))

    def get_user_link(self, obj):
        path = reverse('admin:users_user_change', kwargs={'object_id': obj.user_id})
        return mark_safe(f'<a href="{path}">{obj.user}</a>')
    get_user_link.short_description = 'User'

    def get_game_link(self, obj):
        path = reverse('admin:games_game_change', kwargs={'object_id': obj.program.game_id})
        return mark_safe(f'<a href="{path}">{self.get_game_name(obj)}</a>')
    get_game_link.short_description = 'Game'

    def get_program_link(self, obj):
        path = reverse('admin:users_subscriptionprogram_change', kwargs={'object_id': obj.program_id})
        return mark_safe(f'<a href="{path}">{self.get_status(obj)}:{self.get_game_name(obj)}</a>')
    get_program_link.short_description = 'Program'

    def get_game_name(self, obj):
        return obj.game_name
    get_game_name.short_description = 'Game'

    def get_status(self, obj):
        return obj.program.status
    get_status.short_description = 'Status'

    def export_subscriptions(self, request, queryset):
        # FIXME: create a common mixin for exports
        excludes = Q(user__email='') | Q(user__email__isnull=True)
        values = queryset.exclude(excludes) \
            .annotate(email=F('user__email'), created=TruncDate('user__date_joined'), gid=F('user__gid')) \
            .values('email', 'created', 'gid')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename=usergame-emails.csv'
        csv_writer = csv.writer(response, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        try:
            rows = self._get_rows(values)
        except PAPIException as error:
            logger.error(
                f'Failed to get subscriptions, error: {error} (gids: {list(values["gid"])})'
            )
            return self.message_user(request, 'Failed to get data from the authentication system.', level=ERROR)
        csv_writer.writerows(rows)
        return response

    def _get_rows(self, objs: typing.List[typing.Dict]) -> typing.List[typing.List[str]]:
        rows = [['email', 'created', 'social_emails']]  # head of csv file

        for page_to_papi in get_pages(objs, self.list_per_page):
            gids = [data['gid'] for data in page_to_papi if data['gid']]
            social_emails = get_social_emails(gids)

            for obj in page_to_papi:
                row = [obj['email'], obj['created']]
                try:
                    row.append(','.join(social_emails[obj['gid']]))
                except KeyError:
                    pass
                rows.append(row)
        return rows


@admin.register(models.UserFavoriteGame)
class UserFavoriteGameAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'game', 'position', 'created', 'edited')
    list_display_links = list_display
    raw_id_fields = ('user', 'game')


@admin.register(models.UserFollowElement)
class UserFollowElementAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'content_type', 'object_id', 'added', 'last_viewed_id')
    list_display_links = list_display
    raw_id_fields = ('user', 'content_type')


@admin.register(models.UserReferer)
class UserRefererAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'referer', 'added')
    list_display_links = list_display
    raw_id_fields = ('user', 'referer')


class TokenAdmin(admin.ModelAdmin):
    list_display = ('key', 'user', 'created')
    fields = ('user',)
    raw_id_fields = ('user',)
    ordering = ('-created',)


admin.site.unregister(Token)
admin.site.register(Token, TokenAdmin)
