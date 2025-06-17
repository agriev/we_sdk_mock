from django import dispatch
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models.signals import m2m_changed, post_delete, post_save
from django.dispatch import receiver
from django.utils.timezone import now
from psycopg2 import errorcodes

from apps.common.cache import CommonContentType
from apps.external.tasks import (
    update_imgur, update_metacritic, update_reddit, update_twitch, update_wiki, update_youtube,
)
from apps.games import models
from apps.games.tasks import (
    update_collection, update_collection_feed, update_game_item, update_game_json_field, update_game_seo_fields,
    update_game_totals, update_last_modified, update_likes_totals,
)
from apps.merger.tasks import remove_game_cached
from apps.users.tasks import update_user_statistics
from apps.utils.cache import warm_cache
from apps.utils.tasks import detect_language, get_versions_and_send_slack, send_slack

game_fields_updated = dispatch.Signal(providing_args=['pk', 'fields_was', 'fields'])


@receiver(post_save, sender=models.Game)
def game_post_save(sender, instance, created, **kwargs):
    def on_commit():
        custom_created = created
        if custom_created and instance.is_indie:
            custom_created = False
        if instance.is_init_was_changed('reddit_url', custom_created):
            update_reddit.delay(instance.id, instance.initial_reddit_url, instance.reddit_url, not instance.reddit_url)
        if instance.is_init_was_changed('twitch_name', custom_created):
            update_twitch.delay(instance.id)
        if instance.is_init_was_changed('youtube_name', custom_created):
            update_youtube.delay(instance.id)
        if instance.is_init_was_changed('imgur_name', custom_created):
            update_imgur.delay(instance.id)
        if instance.is_init_was_changed('wikipedia_name', custom_created) and not instance.wikipedia_disable:
            update_wiki.delay(instance.id)
        if instance.is_init_was_changed('metacritic_url', custom_created):
            update_metacritic.delay(instance.id)
        if (
            instance.is_init_was_changed(('image', 'image_background'), created)
            and not settings.DISABLE_GAME_UPDATE_SIGNALS
        ):
            instance.update_persons()
        if instance.is_init_was_changed('name', created):
            if not instance.is_indie:
                update_twitch.delay(instance.id)
                update_imgur.delay(instance.id)
                update_wiki.delay(instance.id)
            instance.create_synonyms_if_not_exists(instance.name)
            if not settings.DISABLE_GAME_UPDATE_SIGNALS:
                update_game_seo_fields.delay(instance.id)
        if (
            instance.is_init_was_changed('esrb_rating_id', custom_created)
            and not settings.DISABLE_GAME_UPDATE_SIGNALS
        ):
            update_game_json_field.delay(instance.id, 'esrb_rating')
        if (
            instance.is_init_was_changed(('image', 'image_background', 'name'), created)
            and not settings.DISABLE_GAME_UPDATE_SIGNALS
        ):
            update_last_modified.delay(instance.id)
        if (
            instance.is_init_was_changed('description_en', created)
            or instance.is_init_was_changed('description_ru', created)
        ):
            if not settings.DISABLE_GAME_UPDATE_SIGNALS:
                update_last_modified.delay(instance.id)
            if instance.description_is_protected:
                get_versions_and_send_slack.delay(
                    instance.id, instance.name, instance.slug, CommonContentType().get(instance).id, only_prod=True
                )
        if instance.is_init_was_changed(('released', 'tba'), created):
            if not settings.DISABLE_GAME_UPDATE_SIGNALS:
                update_last_modified.delay(instance.id)
                update_game_seo_fields.delay(instance.id)

    transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.Game)
def game_post_delete(instance, **kwargs):
    pk = instance.id

    def on_commit():
        remove_game_cached(pk)
        warm_cache(('games',), True)
        instance.update_persons()

    transaction.on_commit(on_commit)


@receiver(m2m_changed, sender=models.Game.developers.through)
@receiver(m2m_changed, sender=models.Game.genres.through)
@receiver(m2m_changed, sender=models.Game.publishers.through)
@receiver(m2m_changed, sender=models.Game.tags.through)
def game_item_changed(sender, instance, action, **kwargs):
    person_senders = {
        models.Game.developers.through: 'developers',
        models.Game.genres.through: 'genres',
    }
    senders_map = {
        models.Game.developers.through: 'developers',
        models.Game.genres.through: 'genres',
        models.Game.publishers.through: 'publishers',
        models.Game.tags.through: 'tags',
    }
    if action in ('post_add', 'post_remove', 'post_clear'):
        def on_commit():
            if not settings.DISABLE_GAME_UPDATE_SIGNALS:
                games = models.Game.objects.filter(id__in=kwargs['pk_set']) if kwargs.get('reverse') else [instance]
                for game in games:
                    if sender in person_senders:
                        game.update_persons([person_senders[sender]])
                    update_game_json_field.delay(game.id, senders_map[sender])
                    if senders_map[sender] != 'tags':
                        update_last_modified.delay(game.id)
                    update_game_seo_fields.delay(game.id,)
                model = instance if kwargs.get('reverse') else kwargs['model']
                pk_set = list(kwargs['pk_set']) if not kwargs.get('reverse') else [instance.id]
                update_game_item.delay(model._meta.app_label, model._meta.model_name, pk_set)
        transaction.on_commit(on_commit)


@receiver(m2m_changed, sender=models.Game.game_series.through)
def game_series_changed(sender, instance, action, **kwargs):
    if not settings.DISABLE_GAME_UPDATE_SIGNALS and action in ('post_add', 'post_remove', 'post_clear'):
        def on_commit():
            update_game_totals.delay(instance.id, 'linked')
            for pk in kwargs['pk_set'] or []:
                update_game_totals.delay(pk, 'linked')
        transaction.on_commit(on_commit)


@receiver(post_save, sender=models.Tag)
def tag_post_save(sender, instance, created, **kwargs):
    def on_commit():
        if instance.language_text_changed() or created:
            detect_language.delay(
                instance.id, instance._meta.app_label, instance._meta.model_name,
                only_local=True, default_language=instance.language
            )
    transaction.on_commit(on_commit)


@receiver(post_save, sender=models.GameStore)
def game_store_post_save(sender, instance, created, **kwargs):
    def on_commit():
        if not settings.DISABLE_GAME_UPDATE_SIGNALS:
            update_game_item.delay(
                models.Store._meta.app_label,
                models.Store._meta.model_name,
                [instance.store_id],
            )
            update_game_json_field.delay(instance.game_id, 'stores')
            update_last_modified.delay(instance.game_id)
            update_game_seo_fields.delay(instance.game_id)
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.GameStore)
def game_store_post_delete(instance, **kwargs):
    def on_commit():
        if not settings.DISABLE_GAME_UPDATE_SIGNALS:
            update_game_item.delay(
                models.Store._meta.app_label,
                models.Store._meta.model_name,
                [instance.store_id],
            )
            update_game_json_field.delay(instance.game_id, 'stores')
            update_game_seo_fields.delay(instance.game_id)
            update_last_modified.delay(instance.game_id)
    transaction.on_commit(on_commit)


@receiver(post_save, sender=models.GamePlatform)
def game_platform_post_save(sender, instance, created, **kwargs):
    def on_commit():
        if created:
            if not settings.DISABLE_GAME_UPDATE_SIGNALS:
                instance.game.update_persons(['platforms'])
        else:
            initial_platform_id = instance.get_init_field('platform_id', False)
            if (
                initial_platform_id and initial_platform_id != instance.platform_id
                and not settings.DISABLE_GAME_UPDATE_SIGNALS
            ):
                update_game_item.delay(
                    models.Platform._meta.app_label,
                    models.Platform._meta.model_name,
                    [instance.initial_platform_id],
                )
        if not settings.DISABLE_GAME_UPDATE_SIGNALS:
            update_game_item.delay(
                models.Platform._meta.app_label,
                models.Platform._meta.model_name,
                [instance.platform_id],
            )
            update_game_json_field.delay(instance.game_id, 'platforms')
            update_game_seo_fields.delay(instance.game_id)
            update_last_modified.delay(instance.game_id)
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.GamePlatform)
def game_platform_post_delete(instance, **kwargs):
    def on_commit():
        if not settings.DISABLE_GAME_UPDATE_SIGNALS:
            try:
                instance.game.update_persons(['platforms'])
            except models.Game.DoesNotExist:
                return
            update_game_item.delay(
                models.Platform._meta.app_label,
                models.Platform._meta.model_name,
                [instance.platform_id],
            )
            update_game_json_field.delay(instance.game_id, 'platforms')
            update_game_seo_fields.delay(instance.game_id)
            update_last_modified.delay(instance.game_id)
    transaction.on_commit(on_commit)


@receiver(post_save, sender=models.Collection)
def collection_post_save(sender, instance, created, **kwargs):
    from apps.feed.signals import MODELS_OPTIONS

    def on_commit():
        if (
            instance.is_init_was_changed('game_background_id', created)
            or instance.is_init_was_changed('is_private', created)
        ):
            update_collection.delay(instance.id, instance.is_init_was_changed('is_private', created))
        if instance.language_text_changed() or created:
            detect_language.delay(
                instance.id, instance._meta.app_label, instance._meta.model_name,
                MODELS_OPTIONS[models.Collection]['language'](instance),
            )
        update_user_statistics.delay(instance.creator_id, ['collection'])
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.Collection)
def collection_post_delete(instance, **kwargs):
    transaction.on_commit(lambda: update_user_statistics.delay(instance.creator_id, ['collection']))


@receiver(post_save, sender=models.CollectionGame)
def collection_game_post_save(sender, instance, created, **kwargs):
    def on_commit():
        if created:
            update_collection.delay(instance.collection_id)
            if not settings.DISABLE_GAME_UPDATE_SIGNALS:
                update_game_totals.delay(instance.game_id, 'collections')
                # update_last_modified.delay(instance.game_id)
            if not instance.skip_auto_feed:
                params = {
                    'collection_id': instance.collection_id,
                    'content_object': instance,
                }
                if instance.add_user_feed:
                    params['user_id'] = instance.add_user_feed
                models.CollectionFeed.objects.create(**params)
        else:
            if instance.is_init_was_changed('collection_id', False):
                update_collection.delay(instance.initial_collection_id)
                update_collection.delay(instance.collection_id)
            if instance.is_init_was_changed('game_id', False):
                if not settings.DISABLE_GAME_UPDATE_SIGNALS:
                    update_game_totals.delay(instance.initial_game_id, 'collections')
                    update_game_totals.delay(instance.game_id, 'collections')
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.CollectionGame)
def collection_game_post_delete(instance, **kwargs):
    pk = instance.id
    content_type = CommonContentType().get(instance)

    def on_commit():
        update_collection.delay(instance.collection_id)
        if not settings.DISABLE_GAME_UPDATE_SIGNALS:
            update_game_totals.delay(instance.game_id, 'collections')
            # update_last_modified.delay(instance.game_id)
        models.CollectionFeed.objects \
            .filter(collection_id=instance.collection_id, content_type=content_type, object_id=pk) \
            .delete()
    transaction.on_commit(on_commit)


@receiver(post_save, sender=models.CollectionFeed)
def collection_feed_post_save(sender, instance, created, **kwargs):
    from apps.feed.signals import MODELS_OPTIONS

    def on_commit():
        content_type = instance.content_type.natural_key()
        is_collection_game = content_type == ('games', 'collectiongame')
        if not is_collection_game:
            update_collection.delay(instance.collection_id)
            update_collection_feed.delay(instance.object_id, content_type, instance.content_type_id)
        if instance.language_text_changed() or created:
            detect_language.delay(
                instance.id, instance._meta.app_label, instance._meta.model_name,
                MODELS_OPTIONS[models.CollectionFeed]['language'](instance),
            )
            models.Collection.objects.filter(id=instance.collection_id).update(updated=now())
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.CollectionFeed)
def collection_feed_post_delete(instance, **kwargs):
    content_type = instance.content_type.natural_key()

    def on_commit():
        if content_type == ('games', 'collectiongame'):
            try:
                models.CollectionGame.objects.get(id=instance.object_id).delete()
            except models.CollectionGame.DoesNotExist:
                pass
        else:
            update_collection.delay(instance.collection_id)
            update_collection_feed.delay(instance.object_id, content_type, instance.content_type_id)
        models.Collection.objects.filter(id=instance.collection_id).update(updated=now())

    transaction.on_commit(on_commit)


@receiver(post_save, sender=models.CollectionLike)
def like_post_save(sender, instance, created, **kwargs):
    transaction.on_commit(lambda: update_likes_totals.delay(instance.collection_id))


@receiver(post_delete, sender=models.CollectionLike)
def like_post_delete(instance, **kwargs):
    transaction.on_commit(lambda: update_likes_totals.delay(instance.collection_id))


@receiver(post_save, sender=models.ScreenShot)
def screenshot_post_save(sender, instance, created, **kwargs):
    if getattr(instance, 'is_form', False):
        send_slack(
            'Screenshot uploaded:\n'
            'https://ag.ru/games/{}\n'
            '{}{}\n'.format(
                instance.game.slug,
                settings.MEDIA_URL,
                instance.visible_image,
            ),
            instance.game.name,
            ':video_game:',
            '#notifs-screenshots',
            True,
        )
        try:
            obj, _ = models.ScreenShotCount.objects.get_or_create(
                game_id=instance.game_id, defaults={'queued': now()}
            )
            if not obj.queued:
                obj.queued = now()
                obj.save(update_fields=['queued'])
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise

    if instance.is_init_was_changed('hidden', created):
        def on_commit():
            if not settings.DISABLE_GAME_UPDATE_SIGNALS:
                update_game_totals.delay(instance.game_id, 'screenshots')
                update_game_json_field.delay(instance.game_id, 'screenshots')
        transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.ScreenShot)
def screenshot_post_delete(instance, **kwargs):
    def on_commit():
        if not settings.DISABLE_GAME_UPDATE_SIGNALS:
            try:
                update_game_totals.delay(instance.game_id, 'screenshots')
                update_game_json_field.delay(instance.game_id, 'screenshots')
            except models.ScreenShot.DoesNotExist:
                pass
    transaction.on_commit(on_commit)


@receiver(post_save, sender=models.Movie)
def movie_post_save(sender, instance, created, **kwargs):
    if created and not settings.DISABLE_GAME_UPDATE_SIGNALS:
        transaction.on_commit(lambda: update_game_totals.delay(instance.game_id, 'movies'))


@receiver(post_delete, sender=models.Movie)
def movie_post_delete(instance, **kwargs):
    if not settings.DISABLE_GAME_UPDATE_SIGNALS:
        transaction.on_commit(lambda: update_game_totals.delay(instance.game_id, 'movies'))


@receiver(post_save, sender=models.Addition)
def addition_post_save(sender, instance, created, **kwargs):
    def on_commit():
        update_game_totals.delay(instance.game_id, 'linked')
        update_game_totals.delay(instance.parent_game_id, 'linked')
    if created and not settings.DISABLE_GAME_UPDATE_SIGNALS:
        transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.Addition)
def addition_post_delete(instance, **kwargs):
    def on_commit():
        update_game_totals.delay(instance.game_id, 'linked')
        update_game_totals.delay(instance.parent_game_id, 'linked')
    if not settings.DISABLE_GAME_UPDATE_SIGNALS:
        transaction.on_commit(on_commit)
