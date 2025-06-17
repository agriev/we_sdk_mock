import datetime
import typing
from hashlib import md5

from django.conf import settings
from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX, UNUSABLE_PASSWORD_SUFFIX_LENGTH
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from django.contrib.sites import models as site_models
from django.db import models, transaction
from django.db.models import QuerySet
from django.http.request import split_domain_port
from django.utils.crypto import get_random_string
from django.utils.functional import cached_property
from knbauth.models import AbstractPlatformUser as BaseAbstractPlatformUser
from ordered_model.models import OrderedModel, OrderedModelManager

from apps.utils.strings import normalize_apostrophes, strip_accents
from apps.utils.tasks import merge_items, update_index_related

default_get_site_by_request = site_models.SiteManager._get_site_by_request


def _get_site_by_request(self, request):
    try:
        return default_get_site_by_request(self, request)
    except (KeyError, site_models.Site.DoesNotExist):
        try:
            domain, port = split_domain_port(request.get_host())
            host = settings.SITE_ALIASES[domain]
        except KeyError:
            raise site_models.Site.DoesNotExist
        if host not in site_models.SITE_CACHE:
            site_models.SITE_CACHE[host] = self.get(domain__iexact=host)
        return site_models.SITE_CACHE[host]


def get_by_language(self, language):
    if len(language) == 3:
        language = settings.LANGUAGES_3_TO_2[language]
    site_id = settings.SITE_LANGUAGES[language]
    if site_id not in site_models.SITE_CACHE:
        site_models.SITE_CACHE[site_id] = self.get(id=site_id)
    return site_models.SITE_CACHE[site_id]


site_models.SiteManager._get_site_by_request = _get_site_by_request
site_models.SiteManager.get_by_language = get_by_language


class ProjectQuerySet(QuerySet):
    pass


class ProjectManager(models.Manager):
    pass


class ProjectModel(models.Model):
    objects: QuerySet = ProjectManager.from_queryset(ProjectQuerySet)()

    class Meta:
        abstract = True


class SynonymModel(ProjectModel):
    synonyms = ArrayField(models.CharField(max_length=200), default=list, blank=True, editable=False)

    @classmethod
    def find_by_synonyms(cls, name):
        # todo move to objects
        return cls.objects.filter(synonyms__contains=[name.lower()])

    def add_synonym(self, name):
        # todo move to objects
        if not name:
            return
        name = normalize_apostrophes(name.lower())
        if name not in self.synonyms:
            self.synonyms.append(name)
        stripped = strip_accents(name)
        if stripped not in self.synonyms:
            self.synonyms.append(stripped)

    class Meta:
        abstract = True
        indexes = [
            GinIndex(fields=['synonyms']),
        ]


class MergeModel(SynonymModel):
    merge_with = models.PositiveIntegerField(null=True, blank=True, default=None, editable=False)

    save_slugs = False

    @transaction.atomic
    def merge(self, ids, user_id=None):
        transaction.on_commit(lambda: merge_items.delay(self.pk, ids, self._meta.app_label,
                                                        self._meta.model_name, user_id))
        self.__class__.objects.filter(id__in=ids).update(merge_with=self.id)

    class Meta(SynonymModel.Meta):
        abstract = True


class InitialValueMixin:
    init_fields = ()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.save_init_fields()

    @cached_property
    def cached_deferred_fields(self):
        return self.get_deferred_fields()

    def save_init_field(self, field):
        if field in self.cached_deferred_fields:
            return
        try:
            setattr(self, 'initial_{}'.format(field), getattr(self, field))
        except AttributeError:
            pass

    def save_init_fields(self):
        for field in self.init_fields:
            self.save_init_field(field)

    def get_init_field(self, field, raise_error=True):
        field = 'initial_{}'.format(field)
        return getattr(self, field) if raise_error else getattr(self, field, None)

    def is_field_will_update(self, field, kwargs):
        not_deferred = field not in self.cached_deferred_fields
        update = not kwargs.get('update_fields') or field in kwargs['update_fields']
        return not_deferred and update

    def is_init_change(self, field, save_kwargs):
        """
        Use it only before the save method
        """
        if not self.is_field_will_update(field, save_kwargs):
            return False
        if not self.id:
            return True
        return getattr(self, field) != self.get_init_field(field)

    def is_init_was_changed(self, field, created):
        """
        Use it only in the post save signal
        """
        if created:
            return True
        if type(field) is not str:
            for f in field:
                try:
                    if getattr(self, f) != self.get_init_field(f):
                        return True
                except AttributeError:
                    continue
            return False
        try:
            return getattr(self, field) != self.get_init_field(field)
        except AttributeError:
            return False


class HiddenManagerMixin:
    def visible(self):
        return self.get_queryset().filter(hidden=False)

    def hidden(self):
        return self.get_queryset().filter(hidden=True)


class HiddenManager(HiddenManagerMixin, models.Manager):
    pass


class HiddenModel(InitialValueMixin, ProjectModel):
    hidden = models.BooleanField(default=False, db_index=True)

    objects: HiddenManager = HiddenManager.from_queryset(ProjectQuerySet)()
    init_fields = ('hidden',)

    def save(self, *args, **kwargs):
        is_change = self.is_init_change('hidden', kwargs)
        super().save(*args, **kwargs)
        if getattr(self, 'set_name', None) and is_change:
            update_index_related.delay(self.id, self._meta.app_label, self._meta.model_name)

    class Meta:
        abstract = True


class LanguageModel(ProjectModel):
    language = models.CharField(max_length=3, default='', db_index=True, editable=False)
    language_detection = models.PositiveIntegerField(default=0, editable=False)
    language_fields = ()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.language_fields:
            if field in self.get_deferred_fields():
                return
        self.initial_language_hash = self.get_language_detection_hash()

    def get_language_detection_text(self):
        return '\n'.join([getattr(self, field) for field in self.language_fields])

    def get_language_detection_hash(self):
        return md5(self.get_language_detection_text().encode('utf-8')).hexdigest()

    def language_text_changed(self):
        try:
            return self.initial_language_hash != self.get_language_detection_hash()
        except AttributeError:
            return False

    class Meta:
        abstract = True


class LanguageHiddenModel(LanguageModel, HiddenModel):
    class Meta:
        abstract = True


class OrderedHiddenManager(HiddenManagerMixin, OrderedModelManager):
    pass


class OrderedHiddenModel(HiddenModel, OrderedModel):
    objects: OrderedHiddenManager = OrderedHiddenManager()

    class Meta:
        abstract = True


class AbstractPlatformUser(BaseAbstractPlatformUser):
    SYNC_FIELDS = BaseAbstractPlatformUser.SYNC_FIELDS + ['last_visit']

    last_visit = models.DateField(null=True, editable=False)

    class Meta:
        abstract = True

    def sync(self, info=None):
        fields = super(AbstractPlatformUser, self).sync(info)
        if not self.password:
            self.password = UNUSABLE_PASSWORD_PREFIX + get_random_string(UNUSABLE_PASSWORD_SUFFIX_LENGTH)
            if 'password' not in fields:
                fields.append('password')
        return fields

    def _prepare_email(self, info):
        value = super()._prepare_email(info)
        if info.get('a_vk'):
            value = value or info['a_vk'][0] + '@vk.com'
            self._vk_accounts = info['a_vk']
        return value

    def _prepare_last_visit(self, info):
        return datetime.date.today()
