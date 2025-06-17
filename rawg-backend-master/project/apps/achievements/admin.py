from django.contrib import admin
from django.core.paginator import Paginator
from django.db.models import Count
from django.template.response import TemplateResponse
from django.utils.safestring import mark_safe

from apps.achievements import models
from apps.utils.admin import CompareVersionAdmin, get_preview
from apps.utils.api import int_or_number


@admin.register(models.ParentAchievementGame)
class ParentAchievementGameAdmin(admin.ModelAdmin):
    change_list_template = 'admin/achievements/parent_achievement_game/change_list.html'
    list_per_page = 100

    def merge_info(self, user_achievements_count, searched_achieves_without_games_list):
        """Merge two querysets into one list of tuples with particular info."""
        user_achievements_count_dict = dict(
            user_achievements_count.values_list('achievement__parent__game_name', 'count'),
        )
        merged_info = [
            (game_name, count, user_achievements_count_dict.get(game_name, 0))
            for game_name, count in searched_achieves_without_games_list
        ]
        return merged_info

    def get_user_achievements_count(self, game_names):
        user_achievements_count = (
            models.UserAchievement
            .objects
            .filter(achievement__parent__game_name__in=game_names, achievement__parent__game_id=None)
            .values('achievement__parent__game_name')
            .annotate(count=Count('id'))
            .order_by('count')
        )
        return user_achievements_count

    def search_by_title(self, request, change_list):
        search_dict = {
            'show_results_count': False,
            'result_count': None,
            'total_result_count': change_list.count(),
            'search_query': request.GET.get('search'),
            'search_result': change_list,
        }
        if not search_dict['search_query']:
            return search_dict
        search_dict['search_result'] = change_list.filter(game_name__icontains=search_dict['search_query'])
        search_dict['show_results_count'] = True
        search_dict['result_count'] = search_dict['search_result'].count()
        return search_dict

    def get_paginate_response(self, request, response):
        paginator = Paginator(response, self.list_per_page)
        page_range = range(1, paginator.num_pages + 1)
        page = int_or_number(request.GET.get('page'), 1)
        paginate_response = paginator.get_page(page)
        return paginate_response, page_range, page

    def changelist_view(self, request, extra_context=None):
        achieves_without_games_list = (
            models.ParentAchievement
            .objects.filter(game_id=None)
            .values('game_name')
            .annotate(count=Count('id'))
            .order_by('-count')
            .values_list('game_name', 'count')
        )

        search_dict = self.search_by_title(request, achieves_without_games_list)

        game_names = search_dict['search_result'].values_list('game_name', flat=True)
        user_achievements_count = self.get_user_achievements_count(game_names)
        achievement_without_games_info = self.merge_info(
            user_achievements_count,
            search_dict['search_result'],
        )

        achievement_without_games, page_range, page_num = self.get_paginate_response(
            request,
            achievement_without_games_info,
        )
        extra_context = {
            'page_range': page_range,
            'current_page': page_num,
            'achievement_without_games': achievement_without_games,
            'result_count': search_dict['result_count'],
            'total_result_count': search_dict['total_result_count'],
            'show_results_count': search_dict['show_results_count'],
            'search_query': search_dict['search_query'],
            'opts': self.model._meta,
            'change': False,
            'is_popup': False,
            'save_as': False,
            'has_delete_permission': False,
            'has_add_permission': False,
            'has_change_permission': False,
            'has_permission': True,
            'cl': {'opts': self.model._meta},
        }
        return TemplateResponse(request, self.change_list_template, extra_context)


@admin.register(models.ParentAchievement)
class ParentAchievementAdmin(CompareVersionAdmin):
    list_display = ('id', 'name', 'game_or_game_name', 'percent', 'preview', 'hidden')
    list_display_links = ('id', 'name', 'game_or_game_name', 'percent')
    raw_id_fields = ('game',)
    search_fields = ('id', 'name')
    readonly_fields = ('percent',)

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('game')

    def has_delete_permission(self, request, obj=None):
        return False

    def game_or_game_name(self, instance):
        return instance.game if instance.game else instance.game_name

    def preview(self, instance):
        first = instance.achievements.first()
        if not first:
            return ''
        return mark_safe(get_preview(first.image, 48))


@admin.register(models.Achievement)
class AchievementAdmin(CompareVersionAdmin):
    list_display = ('id', 'uid', 'name', 'network', 'game_or_game_name', 'percent', 'preview')
    list_display_links = list_display
    raw_id_fields = ('parent',)
    list_filter = ('network', 'hidden')
    search_fields = ('id', 'uid', 'name')
    readonly_fields = ('percent',)

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('parent', 'parent__game')

    def has_delete_permission(self, request, obj=None):
        return False

    def game_or_game_name(self, instance):
        return instance.parent.game if instance.parent.game else instance.parent.game_name

    def preview(self, instance):
        return mark_safe(get_preview(instance.image, 48))


class NoAchievementParentGameFilter(admin.SimpleListFilter):
    title = 'no achievement parent game'
    parameter_name = 'no achievement parent game'

    def lookups(self, request, model_admin):
        return (
            ('no achievement parent game', ('No achievement parent game')),
        )

    def queryset(self, request, queryset):
        if self.value() == 'no achievement parent game':
            return queryset.filter(achievement__parent__game_id=None)


@admin.register(models.UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'network', 'game', 'achievement', 'preview')
    list_display_links = list_display
    raw_id_fields = ('user', 'achievement')
    list_filter = ('achievement__network', NoAchievementParentGameFilter)
    search_fields = ('id', 'user__username', 'user__email', 'achievement__name')

    def lookup_allowed(self, lookup, value):
        if lookup == 'achievement__parent__game_name':
            return True
        return super().lookup_allowed(lookup, value)

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related(
            'achievement', 'achievement__network', 'achievement__parent', 'achievement__parent__game',
        )

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return ['user', 'achievement']
        return super().get_readonly_fields(request, obj)

    def network(self, instance):
        return instance.achievement.network

    def game(self, instance):
        return instance.achievement.parent.game if instance.achievement.parent.game else \
            instance.achievement.parent.game_name

    def preview(self, instance):
        return mark_safe(get_preview(instance.achievement.image, 48))
