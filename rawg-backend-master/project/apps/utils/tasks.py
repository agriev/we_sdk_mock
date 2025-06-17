import typing
from json import JSONDecodeError

import detectlanguage
import pycountry
import reversion
from celery.exceptions import SoftTimeLimitExceeded
from celery_haystack.tasks import CeleryHaystackSignalHandler
from celery_haystack.utils import enqueue_task
from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import OperationalError, transaction
from django.utils import translation
from langdetect.lang_detect_exception import LangDetectException
from reversion.models import Revision, Version

from apps.celery import app as celery
from apps.utils import cache
from apps.utils.emails import send
from apps.utils.lang import local_lang_detect
from apps.utils.slack import send_info

if typing.TYPE_CHECKING:
    from apps.games.models import GameItemBase


@celery.task(soft_time_limit=120, bind=True, ignore_result=True, max_retries=5, default_retry_delay=120)
def send_email(self, template_prefix, context, to_emails, from_email=None, language=None):
    try:
        send(template_prefix, context, to_emails, from_email, language=language)
    except (Exception, SoftTimeLimitExceeded):
        self.retry()


@celery.task(soft_time_limit=120, bind=True, ignore_result=True, max_retries=5, default_retry_delay=120)
def send_slack(self, text, username, icon_emoji, channel, only_prod=False):
    if only_prod and settings.ENVIRONMENT != 'PRODUCTION':
        return
    try:
        send_info(text, username, icon_emoji, channel)
    except (Exception, SoftTimeLimitExceeded):
        self.retry()


@celery.task(time_limit=60, bind=True, acks_late=True, max_retries=1)
def get_versions_and_send_slack(self, object_id, object_name, object_slug, content_type_id, only_prod=False):
    versions_qs = Version.objects.filter(
        content_type_id=content_type_id,
        object_id=object_id,
    ).order_by('-id')
    versions = [v.id for v in versions_qs[:2]]
    if only_prod and settings.ENVIRONMENT != 'PRODUCTION':
        return
    try:
        send_info(
            'Description was changed:\n'
            'https://ag.ru/games/{}\n'
            'https://api.ag.ru/houston/games/game/{}/history/compare/?version_id2={}&version_id1={}\n'.format(
                object_slug, object_id, *versions
            ),
            object_name,
            ':video_game:',
            '#notifs-content',
        )
    except (Exception, SoftTimeLimitExceeded):
        self.retry()


@celery.task(time_limit=60, ignore_result=True)
def warm_cache():
    cache.warm_cache()


def merge_items_parents(
    parent: 'GameItemBase',
    item: 'GameItemBase',
    old_slugs: typing.List[str],
    new_slug: str,
) -> typing.Tuple[str, typing.List]:
    from apps.merger.models import MergedSlug

    parent.add_synonym(item.name)
    item.copy_in_parent(parent)
    item.delete()
    if parent.save_slugs:
        new_slug, old_slug = MergedSlug.save_merged_slugs(item.slug, new_slug, parent)
        old_slugs.append(old_slug)
    return new_slug, old_slugs


@celery.task(
    time_limit=3600 * 3, ignore_result=True, max_retries=5, autoretry_for=(OperationalError,), retry_backoff=10,
    acks_late=True, reject_on_worker_lost=True
)
def merge_items(
    parent_id: int,
    ids: typing.Iterable[int],
    app_label: str,
    model: str,
    user_id: int = None,
    disable_reversion: bool = False,
) -> None:
    from apps.merger.models import MergedSlug

    with translation.override(settings.MODELTRANSLATION_DEFAULT_LANGUAGE), transaction.atomic():
        model = apps.get_model(app_label=app_label, model_name=model)
        parent = model.objects.get(id=parent_id)
        old_slugs = []
        new_slug = parent.slug
        for item in model.objects.filter(id__in=ids):
            if not disable_reversion:
                with reversion.create_revision():
                    new_slug, old_slugs = merge_items_parents(parent, item, old_slugs, new_slug)
                    if user_id:
                        reversion.set_user(get_user_model().objects.get(pk=user_id))
                    reversion.set_comment('Merged items.')
            else:
                new_slug, old_slugs = merge_items_parents(parent, item, old_slugs, new_slug)
        for old_slug in old_slugs:
            MergedSlug.rewrite_merged_slugs(new_slug, old_slug, parent)
        if not disable_reversion:
            with reversion.create_revision():
                parent.slug = new_slug
                parent.save()
                if user_id:
                    reversion.set_user(get_user_model().objects.get(pk=user_id))
                reversion.set_comment('Merged items.')
        else:
            parent.slug = new_slug
            parent.save()


@celery.task(time_limit=120, ignore_result=True)
def update_index_related(pk, app_label, model):
    model = apps.get_model(app_label=app_label, model_name=model)
    try:
        item = model.objects.get(id=pk)
    except model.DoesNotExist:
        return
    try:
        for related in getattr(item, item.set_name).all():
            enqueue_task('update', related)
    except AttributeError:
        pass


@celery.task(time_limit=120, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def detect_language(pk, app_label, model, callback=None, only_local=False, default_language=None):
    model = apps.get_model(app_label=app_label, model_name=model)
    try:
        item = model.objects.get(id=pk)
    except model.DoesNotExist:
        # the item was deleted
        return

    text = item.get_language_detection_text()
    lang_iso_3 = settings.DEFAULT_LANGUAGE
    language_detection = 1

    try:
        lang_iso_1 = local_lang_detect(text)
        if not lang_iso_1:
            if only_local or settings.ENVIRONMENT == 'TESTS':
                lang_iso_1 = default_language or settings.MODELTRANSLATION_DEFAULT_LANGUAGE
                if settings.ENVIRONMENT == 'TESTS':  # todo update tests to remove this
                    language_detection = 2
            else:
                try:
                    detectlanguage.configuration.api_key = settings.DETECT_LANGUAGE_API_KEY
                    lang_iso_1 = detectlanguage.simple_detect(text)
                    language_detection = 2
                except (detectlanguage.DetectLanguageError, JSONDecodeError, IndexError):
                    pass
        country = pycountry.languages.get(alpha_2=lang_iso_1)
        lang_iso_3 = settings.DEFAULT_LANGUAGE
        if country:
            lang_iso_3 = country.alpha_3
    except LangDetectException:
        pass

    model.objects.filter(id=pk).update(language=lang_iso_3, language_detection=language_detection)

    if callback:
        from apps.feed.signals import language_detected
        callback['language'] = lang_iso_3
        language_detected.send(sender=item.__class__, instance=item, **callback)


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def clear_versions(revision_id, versions_ids):
    count = 0
    if versions_ids:
        for version in Version.objects.filter(id__in=versions_ids):
            previous_version = Version.objects.filter(
                object_id=version.object_id,
                content_type_id=version.content_type_id,
                db=version.db,
                id__lt=version.id,
            ).first()
            if not previous_version:
                continue
            if previous_version._local_field_dict == version._local_field_dict:
                version.delete()
                count += 1
    if len(versions_ids) == count:
        Revision.objects.only('id').get(id=revision_id).delete()


class HaystackSignalHandler(CeleryHaystackSignalHandler):
    def run(self, action, identifier, **kwargs):
        try:
            return super(HaystackSignalHandler, self).run(action, identifier, **kwargs)
        except ValueError:
            if action == 'update':
                return
            raise
