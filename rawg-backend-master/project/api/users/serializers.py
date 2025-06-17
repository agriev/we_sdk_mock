from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models.signals import post_delete, post_save
from django.utils.functional import cached_property
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _, ngettext
from drf_haystack.serializers import HaystackSerializer
from psycopg2 import errorcodes
from rest_framework import serializers
from rest_framework.settings import api_settings

from api.serializers_mixins import RetryCreateMixin, SearchMixin
from apps.common.cache import CommonContentType
from apps.credits.models import Person
from apps.games import models as games_models
from apps.merger import tasks
from apps.merger.profiles import gog, steam
from apps.stat.tasks import add_statuses
from apps.token.signals import user_joined, user_out
from apps.users import models, search_indexes, signals
from apps.utils.exceptions import capture_exception
from apps.utils.haystack import clear_id


class UserSerializerMixin(object):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context and self.context['request'].API_CLIENT_IS_WEBSITE:
            if 'following_users' in self.context:
                following = self.context.get('following_users')
                data['following'] = bool(following)
                if type(following) is dict:
                    data['following'] = following.get(instance.id) or False
            data['followers_count'] = instance.followers_count
        return data


class UserSingleSerializer(UserSerializerMixin, serializers.ModelSerializer):
    email = serializers.EmailField(source='real_email', read_only=True)
    # raptr = serializers.FileField(required=False, write_only=True)
    avatar = serializers.URLField(required=False, allow_null=True)
    games_wishlist_count = serializers.IntegerField(read_only=True)
    bonus_balance = serializers.FloatField(read_only=True, source='balance.bonuses')

    private_fields = (
        'email', 'steam_id', 'steam_id_status', 'steam_id_date', 'steam_id_confirm',
        'gamer_tag', 'gamer_tag_status', 'gamer_tag_date', 'gamer_tag_confirm',
        'psn_online_id', 'psn_online_id_status', 'psn_online_id_date', 'psn_online_id_confirm',
        'gog', 'gog_status', 'gog_date',  # 'raptr_status', 'raptr_date',
        'has_confirmed_accounts', 'subscribe_mail_synchronization', 'subscribe_mail_reviews_invite',
        'subscribe_mail_recommendations', 'select_platform', 'settings', 'token_program', 'tokens',
        'is_staff', 'is_editor', 'api_key', 'api_email', 'api_url', 'api_description', 'api_group', 'bonus_balance'
        ''
    )
    statuses_errors = ['error', 'private-user', 'private-games', 'not-found']
    statuses = statuses_errors + ['ready', '']

    def clean_provider_name(self, s):
        if s == 'openid':
            return 'steam'
        return s

    def validate_username(self, value):
        is_changed = self.context['request'].user.username.lower() != value.lower()
        if is_changed and get_user_model().objects.filter(username__iexact=value).count():
            raise serializers.ValidationError(_('A user with that username already exists.'))
        return value

    def validate_full_name(self, value):
        full_name_max_length = 38
        if len(value) > full_name_max_length:
            raise serializers.ValidationError(ngettext(
                'Full name is too long. Must be %(length)d+ character.',
                'Full name is too long. Must be %(length)d+ characters or less.',
                full_name_max_length
            ))
        return value

    def update_steam_status(self, instance, status):
        instance.steam_id_status = status
        instance.steam_id_date = now()
        instance.save(update_fields=['steam_id_status', 'steam_id_date'])

    def update_gog_status(self, instance, status):
        instance.gog_status = status
        instance.gog_date = now()
        instance.save(update_fields=['gog_status', 'gog_date'])

    # def validate_raptr(self, value):
    #     try:
    #         return json.loads(value.read().decode('utf-8'))
    #     except (json.JSONDecodeError, UnicodeDecodeError):
    #         return {'error': now().isoformat()}

    def is_index_user(self, instance):
        user_model = get_user_model()
        return not user_model.objects.get_index_users().filter(id=instance.id).exists()

    def is_staff_user(self, instance):
        community_editors_group_id = 4
        user_groups_ids = instance.groups.values_list('id', flat=True)
        if community_editors_group_id in user_groups_ids and not instance.is_superuser:
            return False
        return instance.is_staff

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['is_staff'] = self.is_staff_user(instance)
        data['is_editor'] = instance.is_staff
        # https://3.basecamp.com/3964781/buckets/10157323/todos/1500850667
        data['noindex'] = True  # self.is_index_user(instance)
        if 'bio' in data:
            data['bio_raw'] = data['bio']
            data['bio'] = instance.bio_html

        if self.context['view'].is_current:
            data['connections'] = [
                self.clean_provider_name(s.provider) for s in instance.socialaccount_set.only('provider', 'user_id')
            ]

            n = now()
            d = timedelta(days=1)

            steam_date = instance.steam_id_date and n - instance.steam_id_date < d
            data['steam_id_locked'] = instance.steam_id_status not in self.statuses
            if instance.steam_id_status == 'error' and not steam_date:
                data['steam_id_status'] = None
            data['last_sync_steam'] = instance.last_sync_steam_fast or instance.last_sync_steam

            xbox_date = instance.gamer_tag_date and n - instance.gamer_tag_date < d
            data['gamer_tag_locked'] = instance.gamer_tag_status not in self.statuses
            if instance.gamer_tag_status == 'error' and not xbox_date:
                data['gamer_tag_status'] = None
            data['last_sync_xbox'] = instance.last_sync_xbox_fast or instance.last_sync_xbox

            psn_date = instance.psn_online_id_date and n - instance.psn_online_id_date < d
            data['psn_online_id_locked'] = instance.psn_online_id_status not in self.statuses
            if instance.psn_online_id_status == 'error' and not psn_date:
                data['psn_online_id_status'] = None
            data['last_sync_psn'] = instance.last_sync_psn_fast or instance.last_sync_psn

            gog_date = instance.gog_date and n - instance.gog_date < d
            data['gog_locked'] = instance.gog_status not in self.statuses
            if instance.gog_status == 'error' and not gog_date:
                data['gog_status'] = None
            data['last_sync_gog'] = instance.last_sync_gog_fast or instance.last_sync_gog

            data['email_confirmed'] = self.context['request'].user.is_confirmed
            data['can_edit_games'] = self.context['request'].user.can_edit_games
            data['set_password'] = instance.has_usable_password()
            data['collections_count'] = instance.collections_all_count

            if not data['api_email'] or not data['api_description']:
                data['api_key'] = None
        else:
            for field in self.private_fields:
                del data[field]
            if self.context and self.context['request'].user.is_authenticated:
                data['compatibility'] = instance.get_compatibility(self.context['request'].user.id)

        if instance.game_background_id:
            game = games_models.Game.objects.only('image', 'image_background').get(id=instance.game_background_id)
            data['game_background'] = {
                'url': game.background_image_full,
                'dominant_color': '0f0f0f',
                'saturated_color': '0f0f0f',
            }
        return data

    def save(self, **kwargs):
        old_steam_id = self.instance.steam_id.strip()
        old_gamer_tag = self.instance.gamer_tag.strip()
        old_psn_online_id = self.instance.psn_online_id.strip()
        old_gog = self.instance.gog.strip()
        # old_raptr = self.instance.raptr

        instance = super().save(**kwargs)
        services = []
        request_data = self.context['request'].data

        new_steam = instance.steam_id.strip()
        if request_data.get('steam_id'):
            is_new_steam = old_steam_id != new_steam and instance.steam_id_status in self.statuses
            is_reimport_steam = old_steam_id == new_steam and instance.steam_id_status in self.statuses_errors
            if new_steam and (is_new_steam or is_reimport_steam or not instance.steam_id_date):
                ready = True
                try:
                    steam_uid = steam.get_id(new_steam, False, settings.EXTERNAL_TIMEOUT)
                    profile = steam.get_profile(steam_uid, False, settings.EXTERNAL_TIMEOUT)
                    if not steam_uid or not profile:
                        self.update_steam_status(instance, 'error')
                        ready = False
                    elif profile['communityvisibilitystate'] != steam.VISIBLE_STATE_PUBLIC:
                        self.update_steam_status(instance, 'private-user')
                        ready = False
                    elif not steam.get_games(steam_uid, False, settings.EXTERNAL_TIMEOUT):
                        self.update_steam_status(instance, 'private-games')
                        ready = False
                except Exception as e:
                    capture_exception(e)
                if ready:
                    services.append('steam')

        new_xbox = instance.gamer_tag.strip()
        if request_data.get('gamer_tag'):
            is_new_xbox = old_gamer_tag != new_xbox and instance.gamer_tag_status in self.statuses
            is_reimport_xbox = old_gamer_tag == new_xbox and instance.gamer_tag_status in self.statuses_errors
            if new_xbox and (is_new_xbox or is_reimport_xbox or not instance.gamer_tag_date):
                services.append('xbox')

        new_psn = instance.psn_online_id.strip()
        if request_data.get('psn_online_id'):
            is_new_psn = old_psn_online_id != new_psn and instance.psn_online_id_status in self.statuses
            is_reimport_psn = old_psn_online_id == new_psn and instance.psn_online_id_status in self.statuses_errors
            if new_psn and (is_new_psn or is_reimport_psn or not instance.psn_online_id_date):
                services.append('playstation')

        new_gog = instance.gog.strip()
        if request_data.get('gog'):
            is_new_gog = old_gog != new_gog and instance.gog_status in self.statuses
            is_reimport_gog = old_gog == new_gog and instance.gog_status in self.statuses_errors
            if new_gog and (is_new_gog or is_reimport_gog or not instance.gog_date):
                ready = True
                try:
                    result = gog.check_profile(new_gog, settings.EXTERNAL_TIMEOUT)
                    if result != 'ok':
                        self.update_gog_status(instance, result)
                        ready = False
                except Exception as e:
                    capture_exception(e)
                if ready:
                    services.append('gog')

        # new_raptr = instance.raptr
        # if request_data.get('raptr'):
        #     is_new_raptr = old_raptr != new_raptr and instance.raptr_status in self.statuses
        #     if new_raptr and (is_new_raptr or not instance.raptr_date):
        #         services.append('raptr')

        if services:
            tasks.import_games(services, instance, self.context['request'])

        save = False
        accounts_count = instance.confirmed_accounts_count
        if not new_steam:
            instance.reset_steam()
            save = True
        if not new_xbox:
            instance.reset_xbox()
            save = True
        if not new_psn:
            instance.reset_playstation()
            save = True
        if not new_gog:
            instance.reset_gog()
            save = True
        # if not new_raptr:
        #     instance.raptr_date = None
        #     instance.raptr_status = ''
        #     save = True
        if save:
            with transaction.atomic():
                instance.save()
                if not instance.has_confirmed_accounts:
                    user_out.send(sender=instance.__class__, instance=instance)
                elif instance.confirmed_accounts_count != accounts_count:
                    user_joined.send(sender=instance.__class__, instance=instance)

        return instance

    class Meta:
        model = models.User
        fields = (
            'id', 'email', 'username', 'slug', 'full_name', 'avatar', 'bio',
            'games_count', 'games_wishlist_count', 'collections_count', 'reviews_count', 'reviews_text_count',
            'comments_count', 'steam_id', 'steam_id_status', 'steam_id_date', 'steam_id_confirm', 'gamer_tag',
            'gamer_tag_status', 'gamer_tag_date', 'gamer_tag_confirm', 'psn_online_id', 'psn_online_id_status',
            'psn_online_id_date', 'psn_online_id_confirm', 'gog', 'gog_status', 'gog_date',
            # 'raptr', 'raptr_status', 'raptr_date',
            'has_confirmed_accounts', 'game_background',
            'following_count', 'share_image',
            'subscribe_mail_synchronization', 'subscribe_mail_reviews_invite', 'subscribe_mail_recommendations',
            'select_platform', 'settings', 'token_program', 'tokens', 'is_staff',
            'rated_games_percent', 'api_key', 'api_email', 'api_url', 'api_description', 'api_group', 'bonus_balance'
        )
        read_only_fields = (
            'id', 'email', 'games_count', 'games_wishlist_count', 'collections_count', 'reviews_count',
            'reviews_text_count', 'comments_count', 'steam_id_status', 'steam_id_date', 'steam_id_confirm',
            'gamer_tag_status', 'gamer_tag_date', 'gamer_tag_confirm', 'psn_online_id_status', 'psn_online_id_date',
            'psn_online_id_confirm', 'gog_status', 'gog_date',
            # 'raptr_status', 'raptr_date',
            'has_confirmed_accounts',
            'following_count', 'share_image', 'settings', 'token_program', 'tokens', 'is_staff', 'bonus_balance'
        )


class UserSerializer(UserSerializerMixin, serializers.ModelSerializer):
    def to_representation(self, instance):
        if getattr(instance, 'user', None):
            instance = instance.user
        return super().to_representation(instance)

    class Meta:
        model = models.User
        fields = (
            'id', 'username', 'slug', 'full_name', 'avatar', 'games_count', 'collections_count'
        )
        read_only_fields = ('id', 'slug', 'games_count', 'collections_count')


class UserSearchSerializer(SearchMixin, HaystackSerializer):
    id = serializers.CharField()
    score = serializers.CharField()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = clear_id(data['id'])
        return data

    class Meta:
        index_classes = [search_indexes.UserIndex]
        fields = (
            'id', 'slug', 'username', 'full_name', 'avatar', 'games_count', 'collections_count', 'image_background',
            'score',
        )


class UserGameSerializer(serializers.ModelSerializer):
    def validate_game(self, value):
        game = self.Meta.model.objects.filter(game=value, user_id=self.context['view'].user_id, hidden=False)
        if self.context['view'].action == 'create' and game.count():
            raise serializers.ValidationError('This game is already in this profile')
        return value

    def update_platforms(self, instance, platforms):
        instance.platforms.clear()
        instance.platforms.add(*platforms)
        instance.save()

    def create(self, validated_data):
        validated_data['referer'] = self.context['request'].META.get('HTTP_X_API_REFERER')
        validated_data['user_id'] = self.context['view'].user_id
        platforms = validated_data.get('platforms', [])
        try:
            with transaction.atomic():
                instance = super().create(validated_data)
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise

            validated_data['hidden'] = False
            instance = self.Meta.model.objects.get(user_id=validated_data['user_id'], game=validated_data['game'])
            instance = super().update(instance, validated_data)
            self.update_platforms(instance, platforms)
        add_statuses.delay(instance.user_id, instance.status)
        return instance

    def update(self, instance, validated_data):
        initial_status = getattr(instance, 'initial_status', False)
        new_status = validated_data.get('status')
        instance.skip_auto_now = True
        if initial_status and new_status and initial_status != new_status:
            instance.skip_auto_now = False
            add_statuses.delay(instance.user_id, new_status)
        return super().update(instance, validated_data)

    class Meta:
        model = models.UserGame
        fields = ('game', 'status', 'platforms')


class UserGameBulkSerializer(serializers.ModelSerializer):
    games = serializers.ListField()
    platforms = serializers.ListField(required=False)
    batch_statuses = serializers.DictField(required=False)
    batch_platforms = serializers.DictField(required=False)
    batch_added = serializers.DictField(required=False)

    def bulk_create(self):
        result = {'games': []}

        batch_statuses = self.validated_data.get('batch_statuses') or {}
        batch_platforms = self.validated_data.get('batch_platforms') or {}
        batch_added = self.validated_data.get('batch_added') or {}

        all_statuses = [x[0] for x in self.Meta.model.STATUSES]
        user_id = self.context['view'].user_id

        post_save.disconnect(signals.user_game_post_save, models.UserGame)

        with transaction.atomic():
            user_games = []
            for game in games_models.Game.objects.filter(id__in=self.validated_data['games']):
                game_id = str(game.id)
                was_changed = False
                user_game, created = self.Meta.model.objects.get_or_create(user_id=user_id, game_id=game.id)

                if created or user_game.hidden:
                    user_game.hidden = False
                    was_changed = True

                if batch_platforms and batch_platforms.get(game_id):
                    platforms = batch_platforms[game_id]
                    if type(platforms) is not list:
                        platforms = [platforms]
                    user_game.platforms.set(platforms)
                    was_changed = True

                if batch_statuses and batch_statuses.get(game_id) and batch_statuses[game_id] in all_statuses:
                    user_game.status = batch_statuses[game_id]
                    was_changed = True

                if batch_added.get(game_id):
                    user_game.added = batch_added[game_id]
                    user_game.skip_auto_now = True
                    was_changed = True

                if was_changed:
                    user_game.save()
                    user_games.append(user_game)

                result['games'].append(game.id)

            transaction.on_commit(lambda: signals.user_game_post_save_base(
                user_games, referer=self.context['request'].META.get('HTTP_X_API_REFERER')
            ))

        post_save.connect(signals.user_game_post_save, models.UserGame)
        return result

    def bulk_update(self):
        result = {
            'games': [],
            'batch_statuses': {},
            'batch_platforms': {},
            'batch_added': {},
        }

        status = self.validated_data.get('status')
        platforms = self.validated_data.get('platforms')

        batch_statuses = self.validated_data.get('batch_statuses') or {}
        batch_platforms = self.validated_data.get('batch_platforms') or {}
        batch_added = self.validated_data.get('batch_added') or {}

        all_statuses = [x[0] for x in self.Meta.model.STATUSES]

        update_statistics = []
        user_games_updated = []
        user_games = self.Meta.model.objects.prefetch_related('platforms') \
            .filter(user_id=self.context['view'].user_id, game_id__in=self.validated_data.get('games'))

        post_save.disconnect(signals.user_game_post_save, models.UserGame)

        with transaction.atomic():
            for user_game in user_games.select_for_update():
                user_game.skip_auto_now = True
                game_id = str(user_game.game_id)
                result['games'].append(user_game.game_id)
                result['batch_platforms'][game_id] = [platform.id for platform in user_game.platforms.all()]
                result['batch_statuses'][game_id] = user_game.status
                result['batch_added'][game_id] = user_game.added

                if batch_platforms:
                    if game_id in batch_platforms:
                        user_game.platforms.set(batch_platforms[game_id])
                elif platforms:
                    user_game.platforms.set(platforms)

                if batch_statuses:
                    if batch_statuses.get(game_id) and batch_statuses[game_id] in all_statuses:
                        if user_game.status != batch_statuses[game_id]:
                            update_statistics.append(batch_statuses[game_id])
                        user_game.status = batch_statuses[game_id]
                        user_game.skip_auto_now = False
                elif status:
                    if user_game.status != status:
                        update_statistics.append(status)
                    user_game.status = status
                    user_game.skip_auto_now = False

                if batch_added.get(game_id):
                    user_game.added = batch_added[game_id]

                user_game.save()
                user_games_updated.append(user_game)

            transaction.on_commit(lambda: signals.user_game_post_save_base(user_games_updated))

        post_save.connect(signals.user_game_post_save, models.UserGame)

        if update_statistics:
            add_statuses.delay(self.context['view'].user_id, update_statistics)
        return result

    def bulk_destroy(self):
        result = {
            'games': [],
            'batch_statuses': {},
            'batch_platforms': {},
            'batch_added': {},
        }
        user_games = self.Meta.model.objects.prefetch_related('platforms') \
            .filter(user_id=self.context['view'].user_id, game_id__in=self.validated_data.get('games'))
        user_games_to_update = user_games.exclude(status=models.UserGame.STATUS_TOPLAY)
        user_games_to_delete = user_games.filter(status=models.UserGame.STATUS_TOPLAY)
        user_games_updated = []
        with transaction.atomic():
            for user_game in user_games_to_update.select_for_update():
                if not user_game.hidden:
                    user_game.hidden = True
                    user_games_updated.append(user_game)
                self.bulk_destroy_result(result, user_game)
                post_save.send(
                    sender=user_game.__class__, instance=user_game, created=False,
                    update_fields=['hidden'], raw=False, using=None,
                )
            for user_game in user_games_to_delete:
                self.bulk_destroy_result(result, user_game)
                post_delete.send(sender=user_game.__class__, instance=user_game, using=None)
            transaction.on_commit(lambda: signals.user_game_post_save_base(user_games_updated))
            user_games_to_update.update(hidden=True)
            user_games_to_delete.delete()
        return result

    def bulk_destroy_result(self, result, user_game):
        game_id = str(user_game.game_id)
        result['games'].append(user_game.game_id)
        result['batch_platforms'][game_id] = [platform.id for platform in user_game.platforms.all()]
        result['batch_statuses'][game_id] = user_game.status
        result['batch_added'][game_id] = user_game.added
        return result

    class Meta:
        model = models.UserGame
        fields = ('games', 'status', 'platforms', 'batch_statuses', 'batch_platforms', 'batch_added')


class UserFavoriteGameSerializer(serializers.ModelSerializer):
    def validate_position(self, value):
        if value < self.Meta.model.MIN_POSITION or value > self.Meta.model.MAX_POSITION:
            raise serializers.ValidationError('The position is invalid. Allowed values are from 0 to 7.')
        return value

    def create(self, validated_data):
        validated_data['user_id'] = self.context['view'].user_id
        try:
            instance = super().create(validated_data)
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
            self.Meta.model.objects \
                .filter(user_id=validated_data['user_id'], position=validated_data['position']).delete()
            self.Meta.model.objects \
                .filter(user_id=validated_data['user_id'], game=validated_data['game']).delete()
            instance = super().create(validated_data)
        models.UserGame.objects.get_or_create(
            user_id=validated_data['user_id'], game=validated_data['game'],
            defaults={'status': models.UserGame.STATUS_OWNED}
        )
        return instance

    class Meta:
        model = models.UserFavoriteGame
        fields = ('game', 'position')


class UserFollowUserSerializer(serializers.ModelSerializer):
    follow = serializers.IntegerField(write_only=True)

    def validate_follow(self, value):
        get_user_model().objects.get(id=value)
        follow = models.UserFollowElement.objects.filter(
            object_id=value, user_id=self.context['view'].user_id, content_type_id=self.context['view'].content_type_id
        )
        if self.context['view'].action == 'create' and follow.count():
            raise serializers.ValidationError('This user is already followed')
        if self.context['view'].user_id == value:
            raise serializers.ValidationError('One cannot follow himself')
        return value

    def create(self, validated_data):
        validated_data['user_id'] = self.context['view'].user_id
        validated_data['object_id'] = validated_data['follow']
        validated_data['content_type_id'] = self.context['view'].content_type_id
        del validated_data['follow']
        return super().create(validated_data)

    class Meta:
        model = models.UserFollowElement
        fields = ('follow',)


class UserFollowCollectionSerializer(serializers.ModelSerializer):
    collection = serializers.IntegerField(write_only=True)

    def validate_collection(self, value):
        collection = models.UserFollowElement.objects.filter(
            object_id=value, user_id=self.context['view'].user_id, content_type_id=self.context['view'].content_type_id
        )
        if self.context['view'].action == 'create' and collection.count():
            raise serializers.ValidationError('This collection is already followed')
        if self.context['view'].user_id == games_models.Collection.objects.only('creator_id').get(id=value).creator_id:
            raise serializers.ValidationError('One cannot follow his collection')
        return value

    def create(self, validated_data):
        validated_data['user_id'] = self.context['view'].user_id
        validated_data['object_id'] = validated_data['collection']
        validated_data['content_type_id'] = self.context['view'].content_type_id
        del validated_data['collection']
        return super().create(validated_data)

    class Meta:
        model = models.UserFollowElement
        fields = ('collection',)


class UserFollowElementSerializer(RetryCreateMixin, serializers.ModelSerializer):
    instance = serializers.CharField(
        write_only=True, help_text=f'Allowed: {", ".join(k for k in models.UserFollowElement.INSTANCES)}'
    )

    class Meta:
        model = models.UserFollowElement
        fields = ('instance', 'object_id')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        model = instance.content_type.model_class()
        elements = (self.context.get('follow_elements') or {}).get(model) or {}
        obj = elements.get(instance.object_id) or None
        if obj:
            data = self.serializers[model](obj, context=self.context).data
        data['instance'] = instance.content_type.model
        data['last_viewed_id'] = instance.last_viewed_id
        return data

    @cached_property
    def serializers(self):
        from api.credits.serializers import PersonSerializer
        from api.games import serializers as games_serializers

        return {
            games_models.Publisher: games_serializers.PublisherSerializer,
            games_models.Developer: games_serializers.DeveloperSerializer,
            Person: PersonSerializer,
            games_models.Genre: games_serializers.GenreSerializer,
            games_models.Platform: games_serializers.PlatformSerializer,
            games_models.Tag: games_serializers.TagSerializer,
            games_models.Store: games_serializers.StoreSingleSerializer,
            games_models.Collection: games_serializers.CollectionShortImageSerializer,
        }

    def validate_instance(self, value):
        if value not in models.UserFollowElement.INSTANCES:
            raise serializers.ValidationError('This instance is not allowed')
        return value

    def validate(self, attrs):
        count = models.UserFollowElement.objects.filter(
            object_id=attrs['object_id'],
            user_id=self.context['view'].user_id,
            content_type_id=CommonContentType().get(models.UserFollowElement.INSTANCES[attrs['instance']]).id,
        )
        if self.context['view'].action == 'create' and count.count():
            raise serializers.ValidationError('This instance is already followed')
        if attrs['instance'] == 'user':
            self.context['view'].content_type_model = get_user_model()
            serializer = UserFollowUserSerializer(context=self.context)
            attrs['object_id'] = serializer.validate_follow(attrs['object_id'])
        if attrs['instance'] == 'collection':
            self.context['view'].content_type_model = games_models.Collection
            serializer = UserFollowCollectionSerializer(context=self.context)
            attrs['object_id'] = serializer.validate_collection(attrs['object_id'])
        return super().validate(attrs)

    def create(self, validated_data):
        validated_data['user_id'] = self.context['view'].user_id
        validated_data['content_type_id'] = CommonContentType().get(
            models.UserFollowElement.INSTANCES[validated_data['instance']]
        ).id
        self.retry_fields['instance'] = validated_data['instance']
        del validated_data['instance']
        return super().create(validated_data)


class PlayerSerializer(serializers.Serializer):
    id = serializers.UUIDField(format='hex')
    username = serializers.CharField()
    avatar = serializers.URLField()
    full_name = serializers.CharField()


class GetPlayersParamSerializer(serializers.Serializer):
    players_ids = serializers.ListField(
        max_length=api_settings.PAGE_SIZE, child=serializers.UUIDField(format='hex'), required=True
    )

    def to_internal_value(self, data):
        ret = {**data}
        if ret.get('players_ids'):
            ret['players_ids'] = list(set(data['players_ids'].split(',')))
        return super().to_internal_value(ret)


class SubscriptionSerializer(serializers.Serializer):
    game_id = serializers.IntegerField(min_value=0, source='program.game_id')
    status = serializers.ChoiceField(choices=models.SubscriptionProgram.STATUSES, source='program.status')

    def validate(self, attrs):
        validated_data = super().validate(attrs)
        try:
            validated_data['program_instance'] = models.SubscriptionProgram.objects.get(
                game_id=validated_data['program']['game_id'], status=validated_data['program']['status']
            )
        except models.SubscriptionProgram.DoesNotExist:
            raise serializers.ValidationError({'game_id': 'program_not_configured'})

        return validated_data

    def create(self, validated_data):
        try:
            return validated_data['program_instance'].subscribe_user(self.context['request'].user)
        except models.SubscriptionProgram.SubscriptionAlreadyExists:
            raise serializers.ValidationError({'error': 'subscription_already_exists'})
