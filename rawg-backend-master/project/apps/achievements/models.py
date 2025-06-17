from hashlib import md5

from django.conf import settings
from django.contrib.postgres.fields import CICharField
from django.core.exceptions import MultipleObjectsReturned
from django.db import models

from apps.games.models import Game
from apps.merger.models import Network
from apps.utils.images import ImageException, content_to_jpeg_file, field_to_jpg, fix_http_url, get_image
from apps.utils.models import InitialValueMixin, LanguageModel
from apps.utils.unchangeable import UnchangeableQuerySet
from apps.utils.upload import upload_to


class ParentAchievement(InitialValueMixin, LanguageModel):
    language = models.CharField(max_length=3, default=None, null=True, db_index=True, editable=False)  # todo delete
    name = CICharField(max_length=250)
    game = models.ForeignKey(Game, models.SET_NULL, blank=True, null=True, related_name='parent_achievements')
    game_name = models.CharField(max_length=200, default='')
    percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, db_index=True, editable=False)
    hidden = models.BooleanField(default=False)
    recalculate = models.BooleanField(default=False)

    init_fields = ('percent', 'game_id')

    class Meta:
        verbose_name = 'Parent Achievement'
        verbose_name_plural = 'Parent Achievements'
        ordering = ('percent',)
        unique_together = ('name', 'game', 'game_name')

    def __str__(self):
        return self.name

    @classmethod
    def get_many_context(cls, parent_achievements):
        data = {}
        if parent_achievements:
            parents = {}
            achievements = Achievement.objects.filter(parent__in=parent_achievements).order_by('network_id')
            for achievement in achievements:
                if parents.get(achievement.id):
                    continue
                parents[achievement.parent_id] = achievement
            data['achievements'] = parents
        return data


class ParentAchievementGame(ParentAchievement):
    init_fields = ()

    class Meta:
        proxy = True
        verbose_name = 'Parent Achievement Without Game'
        verbose_name_plural = 'Parent Achievements Without Games'


def achievement_image(instance, filename):
    return upload_to('achievements', instance, filename, False)


class Achievement(InitialValueMixin, models.Model):
    parent = models.ForeignKey(ParentAchievement, models.CASCADE, related_name='achievements')
    uid = models.CharField(max_length=200)
    name = models.CharField(max_length=250)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=10, blank=True, default='')  # only for psn: bronze, silver, gold, platinum
    network = models.ForeignKey(Network, models.CASCADE)
    image_file = models.FileField(upload_to=achievement_image, blank=True, null=True)
    image_source = models.URLField(max_length=500, blank=True, default='')
    created = models.DateTimeField(auto_now_add=True)
    percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, db_index=True, editable=False)
    hidden = models.BooleanField(default=False)
    recalculate = models.BooleanField(default=False)

    init_fields = ('image_file', 'image_source', 'percent', 'parent_id')

    class Meta:
        verbose_name = 'Achievement'
        verbose_name_plural = 'Achievements'
        ordering = ('percent',)
        unique_together = ('uid', 'network')

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        is_source = self.image_source and self.is_init_change('image_source', kwargs)
        is_file = self.image_file and self.is_init_change('image_file', kwargs)
        if is_source:
            self.image_source = fix_http_url(self.image_source)
        if is_file:
            self.image_file, _, _ = field_to_jpg(self.image_file)
        super().save(*args, **kwargs)
        if is_source and not is_file and settings.CRAWLING_SAVE_IMAGES:
            try:
                self.image_file.save(*content_to_jpeg_file(*get_image(self.image_source)), save=False)
                self.save(update_fields=['image_file'])
            except ImageException:
                pass

    @property
    def image(self):
        if self.image_file:
            return self.image_file
        return self.image_source

    @staticmethod
    def get_uid(game_id, achieve_id):
        uid = '{}_{}'.format(game_id, achieve_id)
        if len(uid) > 250:
            uid = '{}_{}'.format(game_id, md5(str(achieve_id).encode('utf-8')).hexdigest())
        if len(uid) > 250:
            uid = '{}_{}'.format(md5(str(game_id).encode('utf-8')).hexdigest(),
                                 md5(str(achieve_id).encode('utf-8')).hexdigest())
        return uid.lower()

    @staticmethod
    def get_name(name):
        return name.strip()[0:250]

    @staticmethod
    def get_game_name(name):
        return name.strip()[0:200]

    @classmethod
    def create_or_update(cls, uid, name, game_instance, game_name, description, icon, network, hidden):
        name = cls.get_name(name)
        game_name = cls.get_game_name(game_name)

        kwargs = {'name': name, 'defaults': {'hidden': hidden}}
        if game_instance:
            kwargs['game'] = game_instance
            kwargs['defaults']['game_name'] = game_name
        else:
            kwargs['game'] = None
            kwargs['game_name'] = game_name
        try:
            parent, created = ParentAchievement.objects.get_or_create(**kwargs)
        except MultipleObjectsReturned:
            # merge duplicate parent achievements
            filter_kwargs = {key: value for key, value in kwargs.items() if key != 'defaults'}
            parent = None
            created = False
            for parent_achievement in ParentAchievement.objects.filter(**filter_kwargs).order_by('id'):
                if not parent:
                    parent = parent_achievement
                    parent.recalculate = True
                    parent.save(update_fields=['recalculate'])
                else:
                    Achievement.objects.filter(parent=parent_achievement).update(parent=parent, recalculate=True)
                    parent_achievement.delete()

        if not created and hidden and not parent.hidden:
            parent.hidden = hidden
            parent.save(update_fields=['hidden'])

        defaults = {
            'name': name,
            'description': description or '',
            'image_source': icon,
            'parent_id': parent.id,
            'hidden': hidden,
        }
        achievement, created = Achievement.objects.get_or_create(uid=uid, network=network, defaults=defaults)
        if not created and hidden and not achievement.hidden:
            achievement.hidden = hidden
            achievement.save(update_fields=['hidden'])
        return achievement


class UserAchievement(InitialValueMixin, models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    achievement = models.ForeignKey(Achievement, models.CASCADE)
    achieved = models.DateTimeField(blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)

    init_fields = ('user_id', 'achievement_id', 'achieved')
    unchangeable_fields = ('user_id', 'achievement_id')
    objects = UnchangeableQuerySet.as_manager()

    class Meta:
        verbose_name = 'User achievement'
        verbose_name_plural = 'User achievements'
        unique_together = ('user', 'achievement')

    def __str__(self):
        return str(self.id)

    def save(self, *args, **kwargs):
        created = not self.id
        super().save(*args, **kwargs)
        if created:
            self.recalculate(created=True)

    def recalculate(self, created=False, game_id=None):
        try:
            kwargs = {'user_id': self.user_id, 'achievement__network_id': self.achievement.network_id}
            if not game_id:
                game_id = self.achievement.parent.game_id
        except Achievement.DoesNotExist:
            return
        if not game_id:
            kwargs['achievement__parent__game_name'] = self.achievement.parent.game_name
            kwargs['achievement__parent__game_id'] = None
        else:
            kwargs['achievement__parent__game_id'] = game_id
        user_count = UserAchievement.objects.filter(**kwargs).count()
        if (created and user_count == 1) or (not created and not user_count):
            # recalculate percents in all achievements of this game
            # when it is a first user achievement for this game or
            # when there are not achievements for this game
            new_kwargs = {}
            for key, value in kwargs.items():
                if key == 'user_id':
                    continue
                new_kwargs[key.replace('achievement__', '')] = value
        else:
            new_kwargs = {'id': self.achievement_id}
        Achievement.objects.filter(**new_kwargs).update(recalculate=True)
