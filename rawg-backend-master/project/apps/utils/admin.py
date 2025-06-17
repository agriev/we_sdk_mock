from django.conf import settings
from django.contrib.admin.templatetags.admin_list import _boolean_icon
from django.contrib.admin.views.autocomplete import AutocompleteJsonView
from django.core.exceptions import PermissionDenied
from django.core.paginator import Paginator
from django.db import connections, router, transaction
from django.utils.functional import cached_property
from reversion.models import SubquerySQL, Version
from reversion.revisions import _get_content_type
from reversion_compare.admin import CompareVersionAdmin as BaseCompareVersionAdmin

from apps.utils.actions import merge_elements


def get_preview(image, size):
    if not image:
        return ''
    crop_base = 'crop/{0}/{0}/'.format(size)
    crop = '{}{}'.format(settings.MEDIA_URL, crop_base)
    if type(image) is str:
        crop = settings.MEDIA_RESIZE.replace(settings.MEDIA_URL_FOLDER, '/media/{}'.format(crop_base))
    elif settings.ENVIRONMENT == 'DOCKER':
        crop = settings.MEDIA_URL
    result = '{}{}'.format(crop, image)
    return '<img src="{0}" alt="{0}" title="{0}" width="{1}" height="{1}">'.format(result, size)


class MergeAdminMixin(object):
    actions = (merge_elements,)
    readonly_fields = ('synonyms', 'merge_with')

    def locked(self, instance):
        return _boolean_icon(bool(instance.merge_with))

    def has_change_permission(self, request, obj=None):
        if obj and obj.merge_with:
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if obj and obj.merge_with:
            return False
        return True


class ClearCacheMixin:
    def clear_cache(self):
        pass

    def _move_item(self, request, startorder, endorder):
        result = super()._move_item(request, startorder, endorder)
        transaction.on_commit(lambda: self.clear_cache())
        return result

    def message_user(self, *args, **kwargs):
        result = super().message_user(*args, **kwargs)
        transaction.on_commit(lambda: self.clear_cache())
        return result


class CompareVersionAdmin(BaseCompareVersionAdmin):
    def _acl(self, request):
        if not self.has_delete_permission(request):
            raise PermissionDenied

    def recover_view(self, request, version_id, extra_context=None):
        self._acl(request)
        return super().recover_view(request, version_id, extra_context)

    def revision_view(self, request, object_id, version_id, extra_context=None):
        self._acl(request)
        return super().revision_view(request, object_id, version_id, extra_context)

    def changelist_view(self, request, extra_context=None):
        if not extra_context:
            extra_context = {}
        extra_context['has_delete_permission'] = self.has_delete_permission(request)
        return super().changelist_view(request, extra_context)

    def recoverlist_view(self, request, extra_context=None):
        self._acl(request)
        return super().recoverlist_view(
            request, {
                'deleted': self._reversion_order_version_queryset(self.get_deleted(self.model, 100)),
            },
        )

    def history_view(self, request, object_id, extra_context=None):
        self._acl(request)
        return super().history_view(request, object_id, extra_context)

    def get_deleted(self, model, limit):
        model_db = router.db_for_write(model)
        db = Version.objects.db
        connection = connections[db]
        content_type = _get_content_type(model, db)
        subquery = SubquerySQL(
            """
            SELECT MAX(V.{id})
            FROM {version} V
            LEFT JOIN {model} ON V.{object_id} = CAST({model}.{model_id} as {str})
            WHERE
                V.{db} = %s AND
                V.{content_type_id} = %s AND
                {model}.{model_id} IS NULL
            GROUP BY V.{object_id}
            LIMIT %s
            """.format(
                id=connection.ops.quote_name("id"),
                version=connection.ops.quote_name(Version._meta.db_table),
                model=connection.ops.quote_name(model._meta.db_table),
                model_id=connection.ops.quote_name(model._meta.pk.db_column or model._meta.pk.attname),
                object_id=connection.ops.quote_name("object_id"),
                str=Version._meta.get_field("object_id").db_type(connection),
                db=connection.ops.quote_name("db"),
                content_type_id=connection.ops.quote_name("content_type_id"),
                revision_id=connection.ops.quote_name("revision_id"),
            ),
            (model_db, content_type.id, limit),
            output_field=Version._meta.pk,
        )
        return Version.objects.filter(pk__in=subquery)


class AjaxPaginator(Paginator):
    @cached_property
    def count(self):
        return AutocompleteJsonView.paginate_by
