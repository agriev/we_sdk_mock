import random
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.utils.timezone import now

from apps.achievements.models import Achievement, UserAchievement
from apps.feed.feed import game_is_released, most_rated_games, offer_change_playing, offer_rate_game, popular_games
from apps.feed.models import Feed as FeedModel
from apps.games.models import Game, GamePlatform, PlatformParent
from apps.merger.tasks import sync_user
from apps.token.models import Cycle
from apps.token.signals import user_joined, user_out
from apps.token.tasks import update_progress
from apps.users.models import UserGame


class Sync(models.Model):
    ACTIONS_SET_YESTERDAY = 'set_yesterday'
    ACTIONS_SET_YESTERDAY_AND_RUN = 'set_yesterday_and_run'
    ACTIONS_SET_OLD_AND_RUN = 'set_old_and_run'
    ACTIONS = (
        (ACTIONS_SET_YESTERDAY, 'Set a last visit as yesterday'),
        (ACTIONS_SET_YESTERDAY_AND_RUN, 'Set a last visit as yesterday and run a synchronization'),
        (ACTIONS_SET_OLD_AND_RUN, 'Set a last visit as three weeks ago and run a synchronization'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    action = models.CharField(choices=ACTIONS, default=ACTIONS_SET_YESTERDAY, max_length=30)
    games = models.TextField(blank=True, default='',
                             help_text='Add games to the synchronization. One id or slug on a line.')

    class Meta:
        ordering = ('-id',)
        verbose_name = 'Sync'
        verbose_name_plural = 'Syncs'

    def __str__(self):
        return str(self.id)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.action in (self.ACTIONS_SET_YESTERDAY, self.ACTIONS_SET_YESTERDAY_AND_RUN):
            get_user_model().objects.filter(id=self.user_id).update(last_entered=now() - timedelta(days=1))
            if self.action == self.ACTIONS_SET_YESTERDAY_AND_RUN:
                sync_user.delay(self.user_id, is_manual=False)
        if self.action == self.ACTIONS_SET_OLD_AND_RUN:
            get_user_model().objects.filter(id=self.user_id).update(last_entered=now() - timedelta(weeks=3))
            sync_user.delay(self.user_id, is_old=True, is_manual=False)


def get_label(action):
    for slug, name in FeedModel.ACTIONS:
        if slug == action:
            return name
    return ''


class Feed(models.Model):
    ACTIONS = (
        (FeedModel.ACTIONS_GAME_IS_RELEASED, get_label(FeedModel.ACTIONS_GAME_IS_RELEASED)),
        (FeedModel.ACTIONS_OFFER_TO_CHANGE_PLAYING, get_label(FeedModel.ACTIONS_OFFER_TO_CHANGE_PLAYING)),
        (FeedModel.ACTIONS_OFFER_TO_RATE_GAME, get_label(FeedModel.ACTIONS_OFFER_TO_RATE_GAME)),
        (FeedModel.ACTIONS_POPULAR_GAMES, get_label(FeedModel.ACTIONS_POPULAR_GAMES)),
        (FeedModel.ACTIONS_MOST_RATED_GAMES, get_label(FeedModel.ACTIONS_MOST_RATED_GAMES)),
    )
    action = models.CharField(choices=ACTIONS, max_length=30)
    target_user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='+')
    game = models.ForeignKey(Game, models.CASCADE, blank=True, default=None, null=True)
    platform = models.ForeignKey(PlatformParent, models.CASCADE, blank=True, default=None, null=True)

    class Meta:
        ordering = ('-id',)
        verbose_name = 'Feed'
        verbose_name_plural = 'Feed'

    def __str__(self):
        return str(self.id)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.action == FeedModel.ACTIONS_GAME_IS_RELEASED and self.game:
            game_is_released(self.game, now(), [self.target_user_id])
        elif self.action == FeedModel.ACTIONS_OFFER_TO_CHANGE_PLAYING and self.game:
            user_game = UserGame.objects.get_or_create(
                user_id=self.target_user_id, game=self.game, defaults={'status': UserGame.STATUS_PLAYING}
            )[0]
            offer_change_playing(data=(user_game.game_id, self.target_user_id))
        elif self.action == FeedModel.ACTIONS_OFFER_TO_RATE_GAME and self.game:
            user_game = UserGame.objects.get_or_create(
                user_id=self.target_user_id, game=self.game, defaults={'status': UserGame.STATUS_BEATEN}
            )[0]
            offer_rate_game(data=(user_game.game_id, self.target_user_id))
        elif self.action == FeedModel.ACTIONS_POPULAR_GAMES and self.platform:
            game_ids = list(
                GamePlatform.objects.filter(platform__parent_id=self.platform.id)
                .values_list('game_id', flat=True).order_by('?')[0:5]
            )
            users_count = random.randint(0, 2000)
            games_count = random.randint(users_count, 20000)
            popular_games(data={
                'user_ids': [self.target_user_id],
                'game_ids': game_ids,
                'games_count': games_count,
                'users_count': users_count,
                'platforms': self.platform,
            })
        elif self.action == FeedModel.ACTIONS_MOST_RATED_GAMES:
            game_ids = list(Game.objects.values_list('id', flat=True).order_by('?')[0:5])
            users_count = random.randint(0, 2000)
            games_count = random.randint(users_count, 20000)
            most_rated_games(data={
                'user_ids': [self.target_user_id],
                'game_ids': game_ids,
                'games_count': games_count,
                'users_count': users_count,
            })


class Token(models.Model):
    ACTIONS_CONFIRM_USER = 'confirm_user'
    ACTIONS_UNCONFIRM_USER = 'unconfirm_user'
    ACTIONS_ADD_ACHIEVEMENTS = 'add_achievements'
    ACTIONS_CLEAR_CYCLE = 'clear_cycle'
    ACTIONS_FINISH_CYCLE = 'finish_cycle'
    ACTIONS = (
        (ACTIONS_CONFIRM_USER, 'Confirm a user'),
        (ACTIONS_UNCONFIRM_USER, 'Unconfirm a user'),
        (ACTIONS_ADD_ACHIEVEMENTS, 'Add achievements'),
        (ACTIONS_CLEAR_CYCLE, 'Clear the active cycle'),
        (ACTIONS_FINISH_CYCLE, 'Finish the active cycle'),
    )
    action = models.CharField(choices=ACTIONS, default=ACTIONS_CONFIRM_USER, max_length=30, help_text='''
        - Confirm a user: fill a user field OR fill a count field to confirm N random users;<br>
        - Unconfirm a user: fill a user field OR leave all fields blank to unconfirm all users;<br>
        - Add achievements: fill a user field and a count field OR fill only a count field to add N achievements
        to random confirmed users;<br>
        - Clear the active cycle: leave all fields blank;<br>
        - Finish the active cycle: leave all fields blank;
    ''')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, blank=True, default=None, null=True)
    count = models.PositiveIntegerField(blank=True, default=None, null=True)
    date = models.DateTimeField(blank=True, default=None, null=True)

    class Meta:
        ordering = ('-id',)
        verbose_name = 'Token'
        verbose_name_plural = 'Tokens'

    def __str__(self):
        return str(self.id)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        achievements = Achievement.objects.order_by('?').values_list('id', flat=True).exclude(parent__game_id=None)
        if self.action == self.ACTIONS_CONFIRM_USER:
            if self.user_id:
                with transaction.atomic():
                    user = get_user_model().objects.get(id=self.user_id)
                    user.steam_id_confirm = True
                    user.gamer_tag_confirm = True
                    user.psn_online_id_confirm = True
                    user.token_program = True
                    user.save()
                    user_joined.send(sender=user.__class__, instance=user)
            elif self.count:
                for user in get_user_model().objects.filter(token_program=False).order_by('?')[0:self.count]:
                    with transaction.atomic():
                        user.steam_id_confirm = True
                        user.gamer_tag_confirm = True
                        user.psn_online_id_confirm = True
                        user.token_program = True
                        user.save()
                        user_joined.send(sender=user.__class__, instance=user)
        elif self.action == self.ACTIONS_UNCONFIRM_USER:
            if self.user_id:
                with transaction.atomic():
                    user = get_user_model().objects.get(id=self.user_id)
                    user.steam_id_confirm = False
                    user.gamer_tag_confirm = False
                    user.psn_online_id_confirm = False
                    user.token_program = False
                    user.save()
                    user_out.send(sender=user.__class__, instance=user)
            else:
                for user in get_user_model().objects.filter(token_program=True):
                    with transaction.atomic():
                        user.steam_id_confirm = False
                        user.gamer_tag_confirm = False
                        user.psn_online_id_confirm = False
                        user.token_program = False
                        user.save()
                        user_out.send(sender=user.__class__, instance=user)
        elif self.action == self.ACTIONS_ADD_ACHIEVEMENTS and self.count:
            if self.user_id:
                defaults = {'achieved': self.date or now()}
                for achievement_id in achievements[0:self.count]:
                    user_achievement, created = UserAchievement.objects.get_or_create(
                        user_id=self.user_id,
                        achievement_id=achievement_id,
                        defaults=defaults,
                    )
                    if not created:
                        user_achievement.achieved = defaults['achieved']
                        user_achievement.save(update_fields=['achieved'])
            else:
                users = list(
                    get_user_model().objects.filter(token_program=True)
                    .order_by('?').values_list('id', flat=True)[0:self.count]
                )
                count = len(users)
                defaults = {'achieved': self.date or now()}
                for achievement_id in achievements[0:self.count]:
                    user_achievement, created = UserAchievement.objects.get_or_create(
                        user_id=users[random.randint(0, count)],
                        achievement_id=achievement_id,
                        defaults=defaults,
                    )
                    if not created:
                        user_achievement.achieved = defaults['achieved']
                        user_achievement.save(update_fields=['achieved'])
        elif self.action == self.ACTIONS_CLEAR_CYCLE:
            cycle = Cycle.objects.active()
            cycle.user_cycles.all().delete()
            cycle.cycle_karma.all().delete()
        elif self.action == self.ACTIONS_FINISH_CYCLE:
            cycle = Cycle.objects.active()
            cycle.end = now()
            cycle.save()
            update_progress.delay()
