from datetime import timedelta

from django.apps import apps
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.utils.timezone import now

from apps.common.cache import CommonContentType
from apps.feed.models import Feed, FeedQueue, UserFeed, UserNotifyFeed
from apps.games.models import PlatformParent
from apps.reviews.models import Review
from apps.users.models import UserFollowElement, UserGame
from apps.utils.celery import lock_transaction
from apps.utils.dates import monday
from apps.utils.db import copy_from
from apps.utils.list import split

addition = FeedQueue.ADDITION
deletion = FeedQueue.DELETION
user_lock_id = 'apps.feed.feed:users:{}'
collection_lock_id = 'apps.feed.feed:collections:{}'
addition_lock = '{}.lock'.format(addition)
deletion_lock = '{}.lock'.format(deletion)


def addition_lock_user(ins, ob):
    user_lock_id.format(ob.user_id)


def deletion_lock_user(ins, ob):
    user_lock_id.format(ins.data['user'])


def addition_lock_collection(ins, ob):
    collection_lock_id.format(ob.collection_id)


def deletion_lock_collection(ins, ob):
    collection_lock_id.format(ins.data['collection'])


params = {
    'comments^comment': {
        addition: lambda ins, ob:
            added_comment(ob.user_id, ob.id, ob.parent_id, ob.object_id, ob.__class__.__name__, ins),
        deletion: lambda ins, ob:
            delete_comment(ins.data['id'], ins.content_type.model_class().__name__),
        addition_lock: addition_lock_user,
        deletion_lock: deletion_lock_user,
    },
    'comments^like': {
        addition: lambda ins, ob:
            added_comment_like(ob.user_id, ob.id, ob.comment_id, ob.__class__.__name__, ins),
        deletion: lambda ins, ob:
            delete_comment_like(ins.data['id'], ins.content_type.model_class().__name__, ins.created),
        addition_lock: addition_lock_user,
        deletion_lock: deletion_lock_user,
    },
    'discussions.discussion': {
        addition: lambda ins, ob:
            added_discussion(ob.user_id, ob.id, ob.game_id, ins),
        deletion: lambda ins, ob:
            delete_discussion(ins.data['id']),
        addition_lock: addition_lock_user,
        deletion_lock: deletion_lock_user,
    },
    'games.game': {
        deletion: lambda ins, ob:
            delete_game(ins.data['id']),
    },
    'games.collection': {
        addition: lambda ins, ob:
            created_collection(ob.creator_id, ob.id, ins),
        deletion: lambda ins, ob:
            delete_collection(ins.data['id']),
        addition_lock: lambda ins, ob: collection_lock_id.format(ob.id),
        deletion_lock: lambda ins, ob: collection_lock_id.format(ins.data['id']),
    },
    'games.collectiongame': {
        addition: lambda ins, ob:
            added_game_to_collection(ob.collection_id, ob.game_id, ins),
        deletion: lambda ins, ob:
            added_game_to_collection_delete(ins.data['collection'], ins.data['game'], ins.created),
        addition_lock: addition_lock_collection,
        deletion_lock: deletion_lock_collection,
    },
    'games.collectionfeed': {
        addition: lambda ins, ob:
            added_feed_to_collection(ob.collection_id, ob.id, ins),
        deletion: lambda ins, ob:
            added_feed_to_collection_delete(ins.data['collection'], ins.data['id']),
        addition_lock: addition_lock_collection,
        deletion_lock: deletion_lock_collection,
    },
    'games.collectionoffer': {
        addition: lambda ins, ob:
            suggested_game_to_collection(ob.creator_id, ob.collection_id, ob.game_id, ins),
        deletion: lambda ins, ob:
            suggested_game_to_collection_delete(ins.data['creator'], ins.data['collection'], ins.data['game'],
                                                ins.created),
        addition_lock: addition_lock_collection,
        deletion_lock: deletion_lock_collection,
    },
    'games.collectionlike': {
        addition: lambda ins, ob:
            added_like(
                ob.user_id, ob.id, 'creator_id', ob.collection_id, ob.count, 'games', 'collection', 'collections', ins
            ),
        deletion: lambda ins, ob:
            delete_like(ins.data['id'], 'games', 'collection', ins.created),
        addition_lock: addition_lock_user,
        deletion_lock: deletion_lock_user,
    },
    'reviews.review': {
        addition: lambda ins, ob:
            added_review(ob.user_id, ob.id, ob.game_id, ins),
        deletion: lambda ins, ob:
            delete_review(ins.data['id']),
        addition_lock: addition_lock_user,
        deletion_lock: deletion_lock_user,
    },
    'users.user': {
        deletion: lambda ins, ob:
            delete_user(ins.data['id']),
        deletion_lock: lambda ins, ob: user_lock_id.format(ins.data['id']),
    },
    'users.usergame': {
        addition: lambda ins, ob:
            marked_game(ob.user_id, ob.game_id, ob.status, ins, ins.data.get('old_status')),
        deletion: lambda ins, ob:
            marked_game_delete(ins.data['user'], ins.data['game'], ins.data['status'], ins.created),
        addition_lock: addition_lock_user,
        deletion_lock: deletion_lock_user,
    },
    'users.userfollowelement': {
        addition: lambda ins, ob: followed_element(ob, ins),
        deletion: lambda ins, ob: followed_element_delete(ob, ins),
        addition_lock: addition_lock_user,
        deletion_lock: deletion_lock_user,
    },
}


def process_queue(instance, process_num):
    delete = False
    status = FeedQueue.FINISHED
    with transaction.atomic():
        if instance.action == FeedQueue.LANGUAGE:
            language = instance.data.pop('language')
            if not Feed.objects.filter(**instance.data).update(language=language):
                status = FeedQueue.EMPTY
        else:
            name = '{}.{}'.format(instance.content_type.app_label, instance.content_type.model)
            group = params.get(name) or {}
            action = group.get(instance.action)
            group_name = getattr(instance.content_type.model_class(), 'group_name', None)
            if not action and group_name:
                name = '{}^{}'.format(instance.content_type.app_label, group_name)
                group = params.get(name) or {}
                action = group.get(instance.action)
            if action:
                if instance.action == addition:
                    if not instance.content_object:
                        delete = True
                    else:
                        status = process_action(instance, action, group.get(addition_lock), process_num)
                        if status == FeedQueue.FINISHED:
                            FeedQueue.objects \
                                .filter(content_type=instance.content_type, object_id=instance.object_id,
                                        status=FeedQueue.EMPTY) \
                                .update(status=FeedQueue.NEW)
                else:
                    status = process_action(instance, action, group.get(deletion_lock), process_num)
        if delete:
            instance.delete()
            return False
        instance.status = status
        update_fields = ['status']
        if status == FeedQueue.DELAY:
            instance.retries += 1
            instance.execute = now() + timedelta(seconds=instance.retries * 2)
            update_fields += ['retries', 'execute']
        instance.save(update_fields=update_fields)
        return True


def process_action(instance, action, lock, process_num):
    if lock:
        with lock_transaction(lock(instance, instance.content_object), process_num) as acquired:
            if not acquired:
                return FeedQueue.DELAY
            action(instance, instance.content_object)
    else:
        action(instance, instance.content_object)
    return FeedQueue.FINISHED


def followed_element(ob, ins):
    from apps.games.models import Collection

    if ob.content_type_id == CommonContentType().get(get_user_model()).id:
        followed_user(ob.user_id, ob.object_id, ins)
    if ob.content_type_id == CommonContentType().get(Collection).id:
        followed_collection(ob.user_id, ob.object_id, ins)


def followed_element_delete(ob, ins):
    from apps.games.models import Collection

    if ins.data['content_type'] == CommonContentType().get(get_user_model()).id:
        followed_user_delete(ins.data['user'], ins.data['object_id'], ins.created)
    if ins.data['content_type'] == CommonContentType().get(Collection).id:
        followed_collection_delete(ins.data['user'], ins.data['object_id'], ins.created)


def followed_user(user_id, follow_id, queue):
    from_time = queue.created - timedelta(minutes=Feed.GROUP_MINUTES)
    to_time = queue.created + timedelta(minutes=Feed.GROUP_MINUTES)
    feed = Feed.objects.select_followed_user(user_id, created__gte=from_time, created__lte=to_time).first()
    if feed:
        # group events
        feed.add(follow_id, 'users', callback=follow_id, time=queue.created, user_feed_as_new=not queue.old)
    else:
        # create a new event
        Feed.objects.create_followed_user(user_id, follow_id, queue, callback=follow_id)
    # create a full user's feed
    for f in Feed.objects.filter(user_id=follow_id):
        f.set_user_feed_as_new = not queue.old
        UserFeed.objects.create_user_feed(user_id, f)


def followed_user_delete(user_id, follow_id, date):
    # delete the follow action with this user_id and follow_id if it was recently
    created = date - timedelta(minutes=Feed.GROUP_MINUTES)
    feeds = Feed.objects.select_followed_user(user_id, created__gte=created)
    for feed in feeds:
        feed.subtract(follow_id, 'users')
        # delete an event for a unfollowed user if it was recently
        UserNotifyFeed.objects.filter(user_id=follow_id, feed=feed, created__gte=created).delete()
    # delete actions from a user's feed
    UserFeed.objects.delete_source(UserFeed.SOURCES_USER, user_id=user_id, feed__user_id=follow_id)


def marked_game(user_id, game_id, status, queue, old_status=None):
    from_time = queue.created - timedelta(minutes=Feed.GROUP_MINUTES)
    to_time = queue.created + timedelta(minutes=Feed.GROUP_MINUTES)
    for feed in Feed.objects.select_marked_game(user_id, created__gte=from_time, created__lte=to_time):
        deleted = False
        if old_status:
            # status was changed, delete old before
            deleted = feed.subtract(game_id, 'statuses', old_status)
        if feed.data['statuses'] and list(feed.data['statuses'].keys())[0] == status:
            # group events
            feed.add(game_id, 'statuses', status, time=queue.created, user_feed_as_new=not queue.old)
            return
        elif not deleted:
            feed.save()
    if status not in Feed.GAME_STATUSES:
        return
    # create a new event
    Feed.objects.create_marked_game(user_id, game_id, status, queue)
    # create user feeds for the game followers
    for f in Feed.objects.filter(data__games__contains=game_id, action__in=Feed.ACTIONS_FOR_FOLLOWERS_OF_GAME):
        f.set_user_feed_as_new = not queue.old
        UserFeed.objects.create_user_feed(user_id, f, UserFeed.SOURCES_GAME)


def marked_game_delete(user_id, game_id, status, date):
    # delete an action with this user_id and game_id if it was recently
    created = date - timedelta(minutes=Feed.GROUP_MINUTES)
    feeds = Feed.objects.select_marked_game(user_id, created__gte=created)
    for feed in feeds:
        feed.subtract(game_id, 'statuses', status)
    # delete actions from a user's feed
    UserFeed.objects.delete_source(
        UserFeed.SOURCES_GAME, user_id=user_id, feed__data__games__contains=game_id
    )


def followed_collection(user_id, collection_id, queue):
    from apps.games.models import Collection

    try:
        creator_id = Collection.objects.only('creator_id').get(id=collection_id).creator_id
    except Collection.DoesNotExist:
        # collection was deleted
        return

    from_time = queue.created - timedelta(minutes=Feed.GROUP_MINUTES)
    to_time = queue.created + timedelta(minutes=Feed.GROUP_MINUTES)
    feed = Feed.objects.select_followed_collection(user_id, created__gte=from_time, created__lte=to_time) \
        .first()
    if feed:
        # group events
        feed.add(creator_id, 'collections_creators', commit=False, check_exist=False)
        feed.add(collection_id, 'collections', callback=creator_id, time=queue.created, user_feed_as_new=not queue.old)
    else:
        # create a new event
        Feed.objects.create_followed_collection(user_id, collection_id, creator_id, queue, callback=creator_id)
    # create user feeds for the collection followers
    for f in Feed.objects.filter(
        data__collections__contains=collection_id,
        action__in=Feed.ACTIONS_FOR_FOLLOWERS_OF_COLLECTION
    ):
        f.set_user_feed_as_new = not queue.old
        UserFeed.objects.create_user_feed(user_id, f, UserFeed.SOURCES_COLLECTION)


def followed_collection_delete(user_id, collection_id, date):
    from apps.games.models import Collection

    try:
        creator_id = Collection.objects.only('creator_id').get(pk=collection_id).creator_id
    except Collection.DoesNotExist:
        # collection was deleted
        return

    # delete the follow action with this user_id and collection_id if it was recently
    created = date - timedelta(minutes=Feed.GROUP_MINUTES)
    feeds = Feed.objects.select_followed_collection(user_id, created__gte=created)
    for feed in feeds:
        feed.subtract(creator_id, 'collections_creators', commit=False, only_one=True)
        feed.subtract(collection_id, 'collections', callback=creator_id)
        # delete an event for a creator of the collection if it was recently
        for collection_id in feed.data['collections']:
            try:
                if creator_id == Collection.objects.only('creator_id').get(pk=collection_id).creator_id:
                    return
            except Collection.DoesNotExist:
                # collection was deleted
                pass
        UserNotifyFeed.objects.filter(user_id=creator_id, feed=feed, created__gte=created).delete()
    # delete actions from a user's feed
    UserFeed.objects.delete_source(
        UserFeed.SOURCES_COLLECTION, user_id=user_id, feed__data__collections__contains=collection_id
    )


def created_collection(user_id, collection_id, queue):
    from_time = queue.created - timedelta(minutes=Feed.GROUP_MINUTES)
    to_time = queue.created + timedelta(minutes=Feed.GROUP_MINUTES)
    feed = Feed.objects.select_created_collection(user_id, created__gte=from_time, created__lte=to_time).first()
    if feed:
        # group events
        feed.add(collection_id, 'collections', time=queue.created, user_feed_as_new=not queue.old)
    else:
        # create a new event
        Feed.objects.create_created_collection(user_id, collection_id, queue)


def added_game_to_collection(collection_id, game_id, queue):
    from apps.games.models import Collection

    try:
        collection = Collection.objects.only('creator_id', 'created').get(id=collection_id)
    except Collection.DoesNotExist:
        # the collection was deleted
        return

    if collection.created + timedelta(minutes=Feed.COLLECTION_TIME) > queue.created:
        return
    user_id = collection.creator_id
    from_time = queue.created - timedelta(minutes=Feed.GROUP_MINUTES)
    to_time = queue.created + timedelta(minutes=Feed.GROUP_MINUTES)
    feed = Feed.objects.select_added_game_to_collection(
        user_id,
        created__gte=from_time,
        created__lte=to_time,
        data__collections__contains=collection_id
    ).first()
    if feed:
        # group events
        feed.add(game_id, 'games', time=queue.created, user_feed_as_new=not queue.old)
    else:
        # create a new event
        Feed.objects.create_added_game_to_collection(user_id, collection_id, game_id, queue)


def added_game_to_collection_delete(collection_id, game_id, date):
    from apps.games.models import Collection

    try:
        creator_id = Collection.objects.only('creator_id').get(pk=collection_id).creator_id
    except Collection.DoesNotExist:
        # the collection was deleted
        return

    # delete an action with this creator_id and collection_id if it was recently
    feeds = Feed.objects.select_added_game_to_collection(
        creator_id,
        created__gte=date - timedelta(minutes=Feed.GROUP_MINUTES),
        data__collections__contains=collection_id
    )
    for feed in feeds:
        feed.subtract(game_id, 'games')


def added_feed_to_collection(collection_id, feed_id, queue):
    from apps.games.models import Collection, CollectionFeed

    try:
        collection = Collection.objects.only('creator_id', 'created').get(id=collection_id)
    except Collection.DoesNotExist:
        # the collection was deleted
        return

    if collection.created + timedelta(minutes=Feed.COLLECTION_TIME) > queue.created:
        return
    try:
        collection_feed = CollectionFeed.objects.get(id=feed_id)
    except CollectionFeed.DoesNotExist:
        # the collection feed was deleted
        return
    kwargs = {}
    nk = collection_feed.content_type.natural_key()
    if nk == ('games', 'collectiongame'):
        kwargs['game_id'] = collection_feed.content_object.game_id
    elif nk == ('reviews', 'review'):
        kwargs['game_id'] = collection_feed.content_object.game_id
        kwargs['review_id'] = collection_feed.object_id
    elif nk == ('discussions', 'discussion'):
        kwargs['game_id'] = collection_feed.content_object.game_id
        kwargs['discussion_id'] = collection_feed.object_id
    elif nk == ('comments', 'commentreview'):
        kwargs['game_id'] = collection_feed.content_object.object.game_id
        kwargs['review_id'] = collection_feed.content_object.object_id
        kwargs['comment_id'] = collection_feed.object_id
    elif nk == ('comments', 'commentdiscussion'):
        kwargs['game_id'] = collection_feed.content_object.object.game_id
        kwargs['discussion_id'] = collection_feed.content_object.object_id
        kwargs['comment_id'] = collection_feed.object_id
    Feed.objects.create_added_feed_to_collection(collection.creator_id, collection_id, feed_id, queue, **kwargs)


def added_feed_to_collection_delete(collection_id, feed_id):
    from apps.games.models import Collection

    try:
        user_id = Collection.objects.get(pk=collection_id).creator_id
    except Collection.DoesNotExist:
        # the collection was deleted, events were deleted in tasks.delete_collection
        return
    # delete an action with this user_id and feed_id
    feeds = Feed.objects.select_added_feed_to_collection(
        user_id,
        data__collection_feeds__contains=feed_id
    )
    for feed in feeds:
        feed.subtract(feed_id, 'collection_feeds')


def suggested_game_to_collection(user_id, collection_id, game_id, queue):
    from apps.games.models import Collection

    try:
        creator_id = Collection.objects.only('creator_id').get(pk=collection_id).creator_id
    except Collection.DoesNotExist:
        # collection was deleted
        return

    from_time = queue.created - timedelta(minutes=Feed.GROUP_MINUTES)
    to_time = queue.created + timedelta(minutes=Feed.GROUP_MINUTES)
    feed = Feed.objects.select_suggested_game_to_collection(
        user_id,
        created__gte=from_time,
        created__lte=to_time,
        data__collections__contains=collection_id
    ).first()
    if feed:
        # group events
        feed.add(game_id, 'games', callback=creator_id, time=queue.created, user_feed_as_new=not queue.old)
    else:
        # create a new event
        feed = Feed.objects.create_suggested_game_to_collection(
            user_id, collection_id, creator_id, game_id, queue, callback=creator_id
        )


def suggested_game_to_collection_delete(user_id, collection_id, game_id, date):
    from apps.games.models import Collection

    try:
        creator_id = Collection.objects.only('creator_id').get(id=collection_id).creator_id
    except Collection.DoesNotExist:
        # the collection was deleted
        return

    # delete the follow action with this user_id and collection_id if it was recently
    created = date - timedelta(minutes=Feed.GROUP_MINUTES)
    feeds = Feed.objects.select_suggested_game_to_collection(
        user_id, created__gte=created, data__collections__contains=collection_id
    )
    for feed in feeds:
        feed.subtract(game_id, 'games')
        # delete an event for a creator of the collection if it was recently
        for collection_id in feed.data['collections']:
            try:
                if creator_id == Collection.objects.only('creator_id').get(pk=collection_id).creator_id:
                    return
            except Collection.DoesNotExist:
                # collection was deleted
                pass
        UserNotifyFeed.objects.filter(user_id=creator_id, feed=feed, created__gte=created).delete()


def added_review(user_id, review_id, game_id, queue):
    # create a new event
    if not user_id:
        return
    Feed.objects.create_added_review(user_id, review_id, game_id, queue)


def added_discussion(user_id, discussion_id, game_id, queue):
    # create a new event
    Feed.objects.create_added_discussion(user_id, discussion_id, game_id, queue)


def added_comment(user_id, comment_id, parent_id, object_id, model_name, queue):
    model_name = model_name.lower()
    model = apps.get_model(app_label='comments', model_name=model_name)
    related_model = model.object.field.remote_field.model
    related_object = related_model.objects.get(pk=object_id)

    # create a new feed
    elements = comment_elements(model, model_name, comment_id, parent_id, object_id, related_model, related_object)
    feed = Feed.objects.create_added_comment(user_id, elements, queue)

    # create a notification for a creator of the object
    if model.feed_creator_field:
        creator_id = getattr(related_object, '{}_id'.format(model.feed_creator_field))
        if creator_id and creator_id != user_id:
            UserNotifyFeed.objects.create_user_notify_feed(creator_id, feed)

    if parent_id:
        # create a notification for a creator of the parent comment
        parent = model.objects.get(id=parent_id)
        if parent.user_id != user_id:
            UserNotifyFeed.objects.create_user_notify_feed(parent.user_id, feed)

        # create notifications for another participants this discussion
        users = parent.children.values('user_id').order_by('user_id').annotate(c=Count('user_id')) \
            .values_list('user_id', flat=True)
        for user in users:
            if user == user_id:
                continue
            UserNotifyFeed.objects.create_user_notify_feed(user, feed)


def added_comment_like(user_id, like_id, comment_id, model_name, queue):
    model_name = model_name.lower()
    model = apps.get_model(app_label='comments', model_name=model_name)
    comment_model = model.comment.field.remote_field.model
    try:
        comment = comment_model.objects.only('id', 'object_id', 'parent_id', 'user_id').get(id=comment_id)
    except comment_model.DoesNotExist:
        # the comment was deleted
        return
    comment_model_name = comment.__class__.__name__.lower()
    related_model = comment_model.object.field.remote_field.model
    related_object = related_model.objects.get(pk=comment.object_id)

    # create a new feed
    elements = comment_elements(comment_model, comment_model_name, comment_id, comment.parent_id, comment.object_id,
                                related_model, related_object)
    elements['comment_likes'] = {comment_model_name: Feed.objects._ids(like_id)}
    feed = Feed.objects.create_favorite_comment(user_id, elements, queue)

    # create a notification
    UserNotifyFeed.objects.create_user_notify_feed(comment.user_id, feed)


def comment_elements(comment_model, comment_model_name, comment_id, parent_id, object_id,
                     related_model, related_object):
    ids = Feed.objects._ids
    elements = {
        'comments': {comment_model_name: ids(comment_id)},
        comment_model.feed_elements: ids(object_id),
    }
    if parent_id:
        elements['comments_parents'] = {comment_model_name: ids(parent_id)}
    if comment_model.feed_related_elements:
        for related_elements, related_field in comment_model.feed_related_elements.items():
            if type(related_field) is str:
                pk = getattr(related_object, '{}_id'.format(related_field))
            else:
                pk = getattr(getattr(related_object, related_field[0]), '{}_id'.format(related_field[1]))
            elements[related_elements] = ids(pk)
    return elements


def added_like(
    user_id, like_id, object_user_field, object_id, likes_count, app_label, model_name, related_name, queue
):
    app_label = app_label.lower()
    model_name = model_name.lower()
    model = apps.get_model(app_label=app_label, model_name=model_name)
    try:
        obj = model.objects.only('id', object_user_field).get(id=object_id)
    except model.DoesNotExist:
        # the obj was deleted
        return

    # create a new feed
    elements = {
        'likes': {'{}.{}'.format(app_label, model_name): Feed.objects._ids(like_id)},
        related_name: Feed.objects._ids(object_id),
        'likes_count': likes_count,
    }
    feed = Feed.objects.create_like(user_id, elements, queue)

    # create a notification
    UserNotifyFeed.objects.create_user_notify_feed(getattr(obj, object_user_field), feed)


def delete_user(user_id):
    for feed in Feed.objects.select_for_update().filter(data__users__contains=user_id):
        feed.subtract(user_id, 'users')


def delete_game(game_id):
    from apps.users.models import UserGame

    for feed in Feed.objects.select_for_update().filter(data__games__contains=game_id):
        feed.subtract(game_id, 'games')
    for status, _ in UserGame.STATUSES:
        kwargs = {'data__statuses__{}__contains'.format(status): game_id}
        for feed in Feed.objects.select_for_update().filter(**kwargs):
            feed.subtract(game_id, 'statuses', status)


def delete_collection(collection_id):
    for feed in Feed.objects.select_for_update().filter(data__collections__contains=collection_id):
        feed.subtract(collection_id, 'collections')


def delete_review(review_id):
    for feed in Feed.objects.select_for_update().filter(data__reviews__contains=review_id):
        feed.subtract(review_id, 'reviews')


def delete_discussion(discussion_id):
    for feed in Feed.objects.select_for_update().filter(data__discussions__contains=discussion_id):
        feed.subtract(discussion_id, 'discussions')


def delete_comment(comment_id, model_name):
    model_name = model_name.lower()
    kwargs = {'data__comments__{}__contains'.format(model_name): comment_id}
    for feed in Feed.objects.select_for_update().filter(**kwargs):
        feed.subtract(comment_id, 'comments', model_name)


def delete_comment_like(like_id, model_name, date):
    model_name = model_name.lower()
    model = apps.get_model(app_label='comments', model_name=model_name)
    comment_model_name = model.comment.field.remote_field.model.__name__.lower()
    kwargs = {
        'data__comment_likes__{}__contains'.format(comment_model_name): like_id,
        'created__gte': date - timedelta(minutes=Feed.GROUP_MINUTES)
    }
    for feed in Feed.objects.select_for_update().filter(**kwargs):
        feed.subtract(like_id, 'comment_likes', comment_model_name)


def delete_like(like_id, app_label, model_name, date):
    app_label = app_label.lower()
    model_name = model_name.lower()
    name = '{}.{}'.format(app_label, model_name)
    kwargs = {
        'data__likes__{}__contains'.format(name): like_id,
        'created__gte': date - timedelta(minutes=Feed.GROUP_MINUTES)
    }
    for feed in Feed.objects.select_for_update().filter(**kwargs):
        feed.subtract(like_id, 'likes', name)


def game_is_released(game, created, user_ids, new=True):
    queue = FeedQueue.objects.create_queue(game, game.id, FeedQueue.ADDITION, {}, created=created,
                                           status=FeedQueue.FINISHED)
    feed = Feed.objects.create_game_is_released(game.id, queue)
    feed.set_user_feed_as_new = new
    for user_id in user_ids:
        UserNotifyFeed.objects.create_user_notify_feed(user_id, feed)


def marked_game_community(game, created, new=True):
    _community(
        game, created, UserGame.objects.visible().filter(game_id=game.id),
        Feed.objects.create_marked_game_community, new
    )


def follow_user_community(follow, created, new=True):
    _community(
        follow, created, UserFollowElement.objects.filter(
            object_id=follow.id, content_type=CommonContentType().get(get_user_model())
        ),
        Feed.objects.create_followed_user_community, new
    )


def _community(obj, created, users_qs, feed_fn, new):
    queue = FeedQueue.objects.create_queue(obj, obj.id, FeedQueue.ADDITION, {}, created=created,
                                           status=FeedQueue.FINISHED)
    user_ids = list(users_qs.values_list('user_id', flat=True)[0:Feed.LIMIT_ELEMENTS_SINGLE])
    feed = feed_fn(obj.id, user_ids, queue)
    feed.set_user_feed_as_new = new
    UserFeed.objects.create_user_feed(None, feed, UserFeed.SOURCES_COMMON)


def offer_change_playing(data=None):
    feeds = set()
    if data:
        users = [data]
    else:
        users = UserGame.objects.visible().filter(
            status=UserGame.STATUS_PLAYING,
            added__lt=now() - timedelta(days=Feed.OFFER_TO_CHANGE_PLAYING_DAYS)
        ).values_list('game_id', 'user_id')

        condition = None
        for game_id, user_id in users:
            el = Q(data__users__contains=user_id, data__games__contains=game_id)
            if not condition:
                condition = el
                continue
            condition |= el
        feeds = set(
            (feed.data['games'][0], feed.data['users'][0])
            for feed in Feed.objects.filter(condition, action=Feed.ACTIONS_OFFER_TO_CHANGE_PLAYING)
        )
    for i, (game_id, user_id) in enumerate(users):
        if (game_id, user_id) in feeds:
            continue
        _offer(game_id, user_id, Feed.objects.create_offer_to_change_playing)


def offer_rate_game(data=None):
    reviews = set()
    feeds = set()
    if data:
        users = [data]
    else:
        users = tuple(UserGame.objects.visible().only('game_id', 'user_id').filter(
            status=UserGame.STATUS_BEATEN,
            added__gte=now() - timedelta(days=Feed.OFFER_TO_RATE_GAME_DAYS),
        ).values_list('game_id', 'user_id'))
        if not len(users):
            return

        for users_chunk in split(users, 2000):
            reviews |= set(Review.objects.visible().extra(
                where=['(game_id, user_id) in %s'],
                params=[users_chunk]
            ).values_list('game_id', 'user_id'))

            condition = None
            for game_id, user_id in users_chunk:
                el = Q(data__users__contains=user_id, data__games__contains=game_id)
                if not condition:
                    condition = el
                    continue
                condition |= el
            feeds |= set(
                (feed.data['games'][0], feed.data['users'][0])
                for feed in Feed.objects.filter(condition, action=Feed.ACTIONS_OFFER_TO_RATE_GAME)
            )
    for game_id, user_id in users:
        if (game_id, user_id) in reviews or (game_id, user_id) in feeds:
            continue
        _offer(game_id, user_id, Feed.objects.create_offer_to_rate_game)


def _offer(game_id, user_id, feed_fn):
    queue = FeedQueue()
    queue.created = now().replace(hour=0, minute=0, second=0, microsecond=0)
    feed = feed_fn(game_id, user_id, queue)
    UserFeed.objects.create_user_feed(user_id, feed, UserFeed.SOURCES_RECOMMEND)


def popular_games(data=None):
    queue = None
    if data:
        platforms = (data,)
    else:
        end = monday(now())
        start = end - timedelta(days=7)
        queue = FeedQueue()
        queue.created = end
        platforms = []
        slugs = ['playstation', 'xbox', 'pc', 'mac', 'ios', 'nintendo', 'android']
        for platform in PlatformParent.objects.filter(slug__in=slugs):
            game_ids, user_ids, games_count, users_count = platform.games_and_users_top(start, end)
            platforms.append({
                'game_ids': game_ids,
                'user_ids': user_ids,
                'games_count': games_count,
                'users_count': users_count,
                'platform': platform,
            })
    for platform in platforms:
        if not platform['game_ids']:
            continue
        Feed.objects.filter(
            action=Feed.ACTIONS_POPULAR_GAMES,
            data__platform__id=platform['platform'].id
        ).delete()
        feed = Feed.objects.create_popular_games(
            platform['game_ids'],
            platform['games_count'],
            platform['users_count'],
            platform['platform'],
            queue
        )
        # we can do it instead
        # `UserFeed.objects.create_user_feed(user_id, feed, UserFeed.SOURCES_RECOMMEND)`
        # because this user feed can contain only the `UserFeed.SOURCES_RECOMMEND` source
        records = []
        for user_id in platform['user_ids']:
            records.append([
                user_id, feed.id, '{{{}}}'.format(UserFeed.SOURCES_RECOMMEND), True, queue.created.isoformat(), False
            ])
        copy_from(UserFeed, ['user_id', 'feed_id', 'sources', 'new', 'created', 'hidden'], records)


def most_rated_games(data=None):
    user_ids = None
    queue = None
    if data:
        user_ids = data['user_ids']
        game_ids = data['game_ids']
        games_count = data['games_count']
        users_count = data['users_count']
    else:
        end = monday(now())
        start = end - timedelta(days=7)
        game_ids, games_count, users_count = Review.objects.games_and_users_top(start, end)
        queue = FeedQueue()
        queue.created = end
    if not game_ids:
        return
    Feed.objects.filter(action=Feed.ACTIONS_MOST_RATED_GAMES).delete()
    feed = Feed.objects.create_most_rated_games(game_ids, games_count, users_count, queue)
    if user_ids:
        for user_id in user_ids:
            UserFeed.objects.create_user_feed(user_id, feed, UserFeed.SOURCES_RECOMMEND)
    else:
        UserFeed.objects.create_user_feed(None, feed, UserFeed.SOURCES_RECOMMEND)


def added_review_community(review_id, new):
    try:
        feed = Feed.objects.get(
            data__reviews__contains=review_id, action=Feed.ACTIONS_ADD_REVIEW, user__isnull=False)
    except Feed.DoesNotExist:
        return
    feed.set_user_feed_as_new = new
    UserFeed.objects.create_user_feed(None, feed, UserFeed.SOURCES_COMMON)


def added_discussion_community(discussion_id, new):
    try:
        feed = Feed.objects.get(data__discussions__contains=discussion_id, action=Feed.ACTIONS_ADD_DISCUSSION)
    except Feed.DoesNotExist:
        return
    feed.set_user_feed_as_new = new
    UserFeed.objects.create_user_feed(None, feed, UserFeed.SOURCES_COMMON)
