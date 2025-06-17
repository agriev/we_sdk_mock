from hashlib import md5

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import JSONField
from django.db import models
from django.db.models import Prefetch
from django.utils.functional import cached_property

from apps.common.cache import CommonContentType
from apps.common.utils import get_share_image_url
from apps.games.models import CollectionFeed, Game
from apps.utils.lang import get_languages, get_site_by_current_language
from apps.utils.models import HiddenManager, LanguageHiddenModel
from apps.utils.strings import bare_text, safe_text


class Discussion(LanguageHiddenModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='discussions')
    game = models.ForeignKey(Game, models.CASCADE, related_name='discussions')
    title = models.CharField(max_length=100, blank=True, default='')
    text = models.TextField()
    text_safe = models.TextField(blank=True, editable=False)
    text_bare = models.TextField(blank=True, editable=False)
    text_preview = models.TextField(blank=True, editable=False)
    text_previews = JSONField(null=True, blank=True, editable=False)
    text_attachments = models.PositiveIntegerField(default=0, editable=False)
    is_zen = models.BooleanField(default=False, db_index=True)
    created = models.DateTimeField(auto_now_add=True)
    edited = models.DateTimeField(auto_now=True)
    posts_count = models.PositiveIntegerField(default=0, editable=False)
    comments_count = models.PositiveIntegerField(default=0, editable=False)
    comments_parent_count = models.PositiveIntegerField(default=0, editable=False)
    comments_attached = JSONField(null=True, blank=True, editable=False)

    objects = HiddenManager()
    language_fields = ('title', 'text_bare')

    @cached_property
    def share_name(self):
        return md5('{}#{}'.format(self.id, self.title).encode('utf-8')).hexdigest()

    @cached_property
    def share_folder(self):
        return self.share_name[0:3]

    @cached_property
    def share_image(self):
        return get_share_image_url(self, 'api_image:discussion')

    def get_attached_comments(self, request):
        if not self.comments_attached:
            return []
        for lang in get_languages(request):
            if lang in self.comments_attached:
                return self.comments_attached[lang]
        return self.comments_attached.get('common', [])

    def get_context(self, request):
        return self.get_many_context([self], request)

    def get_absolute_url(self):
        return '{}://{}/posts/{}'.format(settings.SITE_PROTOCOL, get_site_by_current_language().name, self.id)

    def save(self, *args, **kwargs):
        self.text_safe = safe_text(self.text)
        self.text_bare, self.text_preview, self.text_previews, self.text_attachments = bare_text(self.text_safe)
        super().save(*args, **kwargs)

    @classmethod
    def get_many_context(cls, discussions, request=None, comments=True, posts=True):
        context = {}
        if request and discussions:
            if comments:
                ids = []
                for discussion in discussions:
                    ids += discussion.get_attached_comments(request)
                # noinspection PyUnresolvedReferences
                comment_model = cls.comments.field.model
                prefetch = Prefetch('user', queryset=get_user_model().objects.defer_all())
                context['discussions_comments'] = comment_model.objects.prefetch_related(prefetch).in_bulk(ids)
                if request.user.is_authenticated and context['discussions_comments']:
                    context.update(comment_model
                                   .get_many_context(list(context['discussions_comments'].values()), request))
            if request.user.is_authenticated and posts:
                kwargs = {
                    'content_type_id': CommonContentType().get(cls).id,
                    'object_id__in': [discussion.id for discussion in discussions],
                    'collection__creator_id': request.user.id,
                }
                context['discussions_discussion_users_posts'] = CollectionFeed.objects.filter(**kwargs) \
                    .values_list('object_id', flat=True)
        return context

    def __str__(self):
        return self.title

    class Meta:
        ordering = ('-id',)
        verbose_name = 'Discussion'
        verbose_name_plural = 'Discussions'
