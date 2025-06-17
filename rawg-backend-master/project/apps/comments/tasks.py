from celery_haystack.utils import enqueue_task
from django.apps import apps
from django.db.models import Count, Max

from api.comments.paginations import CommentPagination
from apps.celery import app as celery
from apps.utils.celery import lock_transaction
from apps.utils.haystack import model_in_index
from apps.utils.tasks import detect_language

object_lock_template = 'apps.comments.tasks:object:{}:{}'


@celery.task(time_limit=60, bind=True, ignore_result=True, max_retries=90, acks_late=True, reject_on_worker_lost=True)
def update_comment(self, comment_id, model, last, attached, sender_name, language=True):
    model = apps.get_model(app_label='comments', model_name=model)
    try:
        comment = model.objects.get(id=comment_id)
    except model.DoesNotExist:
        return
    if language:
        detect_language(comment_id, comment._meta.app_label, comment._meta.model_name)
    with lock_transaction(object_lock_template.format(sender_name, comment.object_id), self.app.oid) as acquired:
        if not acquired:
            self.retry(countdown=1, args=(comment_id, model, last, attached, sender_name, False))
        if last and not comment.parent_id:
            update_attached_internal(model, comment.object_id)
        if attached and not comment.parent_id:
            update_last_internal(model, comment.object_id)


@celery.task(time_limit=60, bind=True, ignore_result=True, max_retries=90, acks_late=True, reject_on_worker_lost=True)
def update_comments_totals(self, comment_id, parent_id, object_id, model):
    from apps.comments.signals import comment_object_fields_updated

    parent_lock = 'apps.comments.tasks:comment:{}:{}'.format(model, parent_id if parent_id else comment_id)
    object_lock = 'apps.comments.tasks:object:{}:{}'.format(model, object_id)
    with lock_transaction(parent_lock, self.app.oid) as lock1, lock_transaction(object_lock, self.app.oid) as lock2:
        if not lock1 or not lock2:
            self.retry(countdown=1)
        model = apps.get_model(app_label='comments', model_name=model)
        is_indexed = model_in_index(model)
        if parent_id:
            try:
                comments_count = model.objects.only('id').get(id=parent_id).children.count()
                model.objects.select_for_update().filter(id=parent_id).update(comments_count=comments_count)
                if is_indexed:
                    enqueue_task('update', model.objects.get(id=parent_id))
            except model.DoesNotExist:
                pass
        object_model = model.object.field.remote_field.model
        objects = object_model.objects
        try:
            obj = objects.get(id=object_id)
        except object_model.DoesNotExist:
            return
        fields = {
            'comments_count': objects.only('id').get(id=object_id).comments.count(),
            'comments_parent_count': objects.only('id').get(id=object_id).comments.filter(parent_id=None).count()
        }
        objects.select_for_update().filter(id=object_id).update(**fields)
        if is_indexed:
            enqueue_task('update', model.objects.get(id=object_id))
        comment_object_fields_updated.send(
            sender=obj.__class__, pk=object_id,
            fields_was={'comments_count': obj.comments_count, 'comments_parent_count': obj.comments_parent_count},
            fields=fields
        )


@celery.task(time_limit=60, bind=True, ignore_result=True, max_retries=90, acks_late=True, reject_on_worker_lost=True)
def update_likes_totals(self, comment_id, model):
    lock_id = 'apps.comments.tasks:comment:{}:{}'.format(model, comment_id)
    with lock_transaction(lock_id, self.app.oid) as acquired:
        if not acquired:
            self.retry(countdown=1)
        model = apps.get_model(app_label='comments', model_name=model).comment.field.remote_field.model
        try:
            likes_count = model.objects.only('id').get(id=comment_id).likes.count()
            model.objects.select_for_update().filter(id=comment_id).update(likes_count=likes_count)
        except model.DoesNotExist:
            pass


def update_attached_add(all_comments, comments, lang, kwargs):
    if all_comments.filter(**kwargs).aggregate(Max('likes_count'))['likes_count__max']:
        comments[lang] = sorted(all_comments.filter(likes_count__gt=0, **kwargs)
                                .order_by('-likes_count')
                                .values_list('id', flat=True)[0:3])
    else:
        comments[lang] = list(all_comments.filter(**kwargs)
                              .order_by('-created')
                              .values_list('id', flat=True)[0:3])[::-1]


def update_attached_internal(model, object_id):
    model = model.object.field.remote_field.model
    is_indexed = model_in_index(model)
    objects = model.objects
    try:
        all_comments = objects.only('id').get(id=object_id).comments
    except model.DoesNotExist:
        return
    languages = all_comments.values('language') \
        .annotate(count=Count('id')).order_by('language').values_list('language', flat=True)
    comments = {}
    for lang in languages:
        update_attached_add(all_comments, comments, lang, {'language': lang, 'parent_id__isnull': True})
    update_attached_add(all_comments, comments, 'common', {'parent_id__isnull': True})
    objects.select_for_update().filter(id=object_id).update(comments_attached=comments)
    if is_indexed:
        enqueue_task('update', model.objects.get(id=object_id))


@celery.task(time_limit=60, bind=True, ignore_result=True, max_retries=90, acks_late=True, reject_on_worker_lost=True)
def update_attached(self, comment_id, object_id, model_name, is_like=False):
    model = apps.get_model(app_label='comments', model_name=model_name)
    if is_like:
        model = model.comment.field.remote_field.model
        try:
            comment = model.objects.only('id', 'parent_id').get(id=comment_id)
            if not object_id:
                object_id = comment.object_id
            else:
                return
            if comment.parent_id:
                return
        except model.DoesNotExist:
            return
    object_lock = object_lock_template.format(model_name, object_id)
    with lock_transaction(object_lock, self.app.oid) as acquired:
        if not acquired:
            self.retry(countdown=1)
        update_attached_internal(model, object_id)


def update_last_internal(model, object_id):
    model = model.object.field.remote_field.model
    is_indexed = model_in_index(model)
    objects = model.objects
    try:
        objects_comments = objects.only('id').get(id=object_id).comments.filter(parent=None)
    except model.DoesNotExist:
        return
    objects.select_for_update().filter(id=object_id).update(comments_last={
        'comments': objects_comments.values_list('id', flat=True)[0:CommentPagination.page_size][::-1],
        'total': objects_comments.count(),
        'on_page': CommentPagination.page_size,
    })
    if is_indexed:
        enqueue_task('update', model.objects.get(id=object_id))


@celery.task(time_limit=60, bind=True, ignore_result=True, max_retries=90, acks_late=True, reject_on_worker_lost=True)
def update_last(self, comment_id, object_id, model_name):
    model = apps.get_model(app_label='comments', model_name=model_name)
    object_lock = object_lock_template.format(model_name, object_id)
    with lock_transaction(object_lock, self.app.oid) as acquired:
        if not acquired:
            self.retry(countdown=1)
        update_last_internal(model, object_id)
