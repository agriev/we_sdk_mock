import math

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from django.utils.timezone import now

from apps.achievements.models import Achievement, ParentAchievement, UserAchievement
from apps.utils.exceptions import capture_exception


class Command(BaseCommand):
    block = 1000

    def handle(self, *args, **options):
        try:
            self.run_achievements()
            self.run_parents()
        except Exception as e:
            capture_exception(e)
            self.stdout.write(self.style.ERROR(str(e)))
        self.stdout.write(self.style.SUCCESS('OK'))

    def run_achievements(self):
        qs = Achievement.objects.prefetch_related('parent').only('id', 'network_id', 'parent_id', 'percent') \
            .order_by('network_id', 'parent__game_id', 'parent__game_name').filter(recalculate=True)
        total = qs.count()
        users_with_game = {}
        recalculate = set()
        for group in range(0, int(math.ceil(total / self.block))):
            for i, achievement in enumerate(qs[0:self.block]):
                new_percent = 0
                users_with_achievement = achievement.userachievement_set.count()
                if users_with_achievement:
                    key = self.achievement_key(achievement)
                    if not users_with_game.get(key):
                        users_with_game[key] = self.achievements_users_with_game(achievement)
                    one_percent = users_with_game[key] / 100
                    new_percent = round(users_with_achievement / one_percent, 2) if one_percent else 0
                    if new_percent > 100:
                        # count users with this game is wrong, send all achievements of this game to recalculate
                        recalculate.update(self.achievements_with_game(achievement))
                        continue
                achievement.percent = new_percent
                achievement.recalculate = False
                with transaction.atomic():
                    achievement.save(update_fields=['percent', 'recalculate'])
                    if achievement.parent and not achievement.parent.recalculate:
                        achievement.parent.recalculate = True
                        achievement.parent.save(update_fields=['recalculate'])

                self.stdout.write(self.style.SUCCESS(
                    '{:%Y-%m-%d %H:%M:%S} | Achievements {} of {}'.format(now(), i + self.block * group, total)
                ))
        if recalculate:
            Achievement.objects.filter(id__in=recalculate).update(recalculate=True)
            self.run_achievements()

    def achievements_with_game(self, achievement):
        kwargs = {'network_id': achievement.network_id}
        if not achievement.parent.game_id:
            kwargs['parent__game_name'] = achievement.parent.game_name
        else:
            kwargs['parent__game_id'] = achievement.parent.game_id
        return Achievement.objects.filter(**kwargs).values_list('id', flat=True)

    def achievements_users_with_game(self, achievement):
        achievement_ids = list(self.achievements_with_game(achievement))
        return UserAchievement.objects.filter(achievement_id__in=achievement_ids) \
            .values_list('user_id').annotate(count=Count('id')).order_by('user_id').count()

    def achievement_key(self, achievement):
        return '{}#{}#{}'.format(achievement.network_id, achievement.parent.game_id, achievement.parent.game_name)

    def run_parents(self):
        qs = ParentAchievement.objects.only('id', 'game_id', 'game_name', 'percent').order_by('game_id', 'game_name') \
            .filter(recalculate=True)
        total = qs.count()
        users_with_game = {}
        recalculate = set()
        for group in range(0, int(math.ceil(total / self.block))):
            for i, parent in enumerate(qs[0:self.block]):
                new_percent = 0
                users_with_parent = UserAchievement.objects.filter(achievement__parent_id=parent.id) \
                    .values_list('user_id').annotate(count=Count('id')).order_by('user_id').count()
                if users_with_parent:
                    key = self.parent_key(parent)
                    if not users_with_game.get(key):
                        users_with_game[key] = self.parents_users_with_game(parent)
                    one_percent = users_with_game[key] / 100
                    new_percent = round(users_with_parent / one_percent, 2) if one_percent else 0
                    if new_percent > 100:
                        # count users with this game is wrong, send all achievements of this game to recalculate
                        recalculate.update(self.parents_with_game(parent))
                        continue
                parent.percent = new_percent
                parent.recalculate = False
                parent.is_process = True
                parent.save(update_fields=['percent', 'recalculate'])
                self.stdout.write(self.style.SUCCESS(
                    '{:%Y-%m-%d %H:%M:%S} | Parent Achievements {} of {}'.format(now(), i + self.block * group, total)
                ))
        if recalculate:
            ParentAchievement.objects.filter(id__in=recalculate).update(recalculate=True)
            self.run_parents()

    def parents_with_game(self, parent):
        kwargs = {}
        if not parent.game_id:
            kwargs['game_name'] = parent.game_name
        else:
            kwargs['game_id'] = parent.game_id
        return ParentAchievement.objects.filter(**kwargs).values_list('id', flat=True)

    def parents_users_with_game(self, parent):
        parent_ids = list(self.parents_with_game(parent))
        return UserAchievement.objects.filter(achievement__parent_id__in=parent_ids) \
            .values_list('user_id').annotate(count=Count('id')).order_by('user_id').count()

    def parent_key(self, achievement):
        return '{}#{}'.format(achievement.game_id, achievement.game_name)
