import itertools
from abc import ABC

from django.apps import apps
from django.contrib.auth import get_user_model

from apps.discussions.models import Discussion
from apps.games.models import Collection, CollectionFeed, Game
from apps.reviews.models import Review


class Element(ABC):
    items = None
    counts = None
    context = None
    objects = None
    name = ''
    update_global_context = False

    def __init__(self, context):
        self.items = {}
        self.counts = {}
        self.context = context
        super().__init__()

    def add_items(self, feed, items, limit=None):
        self.items[feed.id] = items[-limit:] if limit else items
        self.add_count(feed, len(items))

    def add_count(self, feed, count):
        self.counts[feed.id] = count

    def get_flat_items(self):
        return {pk for ids in self.items.values() for pk in ids}

    def get_key(self):
        return 'feed_{}'.format(self.name)

    def get_serializer(self):
        return object

    def get_context_params(self):
        return {'request': self.context['request']}

    def get_context(self):
        elements = self.objects.in_bulk(self.get_flat_items())
        model_context = self.get_additional_model_context(elements)
        kwargs = {'many': True, 'context': self.context}
        if not self.update_global_context:
            kwargs['context'] = self.context.copy()
        kwargs['context'].update(model_context)
        output = {}
        for feed_id, ids in self.items.items():
            data = [elements[pk] for pk in ids if elements.get(pk)]
            output[feed_id] = {
                'count': self.counts[feed_id],
                'results': self.get_serializer()(data, **kwargs).data,
            }
        return output

    def get_additional_model_context(self, elements):
        params = self.get_context_params()
        values = list(elements.values())
        if params and values:
            return self.objects.model.get_many_context(values, **params)
        return {}


class GroupElement(Element):
    groups = None
    counts_groups = None

    def __init__(self, context):
        self.groups = {}
        self.counts_groups = {}
        super().__init__(context)

    def add_groups(self, feed, group, groups, limit):
        self.groups.setdefault(feed.id, {})[group] = groups[-int(limit / 2):]
        self.add_counts_groups(feed, group, len(groups))

    def add_counts_groups(self, feed, status, count):
        data = self.counts_groups.get(feed.id) or {}
        data[status] = count
        self.counts_groups[feed.id] = data

    def add_items_total(self, feed):
        ids = [data for data in (self.groups.get(feed.id) or {}).values()]
        super().add_items(feed, list(itertools.chain.from_iterable(ids)))
        self.add_count_total(feed)

    def add_count_total(self, feed):
        counts = (self.counts_groups.get(feed.id) or {}).values()
        super().add_count(feed, sum([count for count in counts]))


class UserElement(Element):
    objects = get_user_model().objects
    name = 'users'
    update_global_context = True

    def __init__(self, context, additional_users):
        self.additional = additional_users
        super().__init__(context)

    def get_serializer(self):
        from api.users.serializers import UserSerializer
        return UserSerializer

    def add_items(self, feed, items, limit=None):
        if feed.action == feed.ACTIONS_FOLLOW_USER:
            if self.context['view'].action == 'notifications':
                items = [self.context['request'].user.id]
            else:
                items = [item for item in items if item != self.context['request'].user.id]
        elif feed.action == feed.ACTIONS_FOLLOW_USER_COMMUNITY:
            items.append(items.pop(0))
        super().add_items(feed, items, limit)
        if feed.action == feed.ACTIONS_FOLLOW_USER_COMMUNITY:
            self.counts[feed.id] -= 1

    def get_context_params(self):
        return {'request': self.context['request']}

    def get_additional_model_context(self, elements):
        return self.objects.model.get_many_context(set(list(elements.values()) + self.additional),
                                                   **self.get_context_params())


class CollectionElement(Element):
    objects = Collection.objects.prefetch_related('creator')
    name = 'collections'

    def get_serializer(self):
        from api.games.serializers import CollectionListSerializer
        return CollectionListSerializer

    def add_items(self, feed, items, limit=None):
        if feed.action == feed.ACTIONS_FOLLOW_COLLECTION:
            result = []
            user_id = self.context['request'].user.id
            for i, item in enumerate(items):
                creator_id = feed.data['collections_creators'][i]
                if self.context['view'].action == 'notifications':
                    cond = creator_id != user_id
                else:
                    cond = creator_id == user_id
                if cond:
                    continue
                result.append(item)
            items = result
        super().add_items(feed, items, limit)

    def get_context_params(self):
        return {'request': self.context['request'], 'full': False}


class CollectionFeedElement(Element):
    objects = CollectionFeed.objects
    name = 'collection_feeds'

    def get_serializer(self):
        from api.games.serializers import CollectionFeedSerializer
        return CollectionFeedSerializer

    def get_context_params(self):
        return {'request': self.context['request'], 'full': False}


class GameElement(GroupElement):
    objects = Game.objects.defer_all()
    name = 'games'
    update_global_context = True

    def add_items(self, feed, items, limit=None):
        if feed.action in (feed.ACTIONS_ADD_GAME_TO_COLLECTION, feed.ACTIONS_SUGGEST_GAME_TO_COLLECTION):
            limit = int(limit / 2)
        super().add_items(feed, items, limit)

    def get_serializer(self):
        from api.games.serializers import GameSerializer
        return GameSerializer

    def get_additional_model_context(self, elements):
        context = super().get_additional_model_context(elements)
        context['feed_statuses'] = self.groups
        context['feed_counts_statuses'] = self.counts_groups
        return context


class ReviewElement(Element):
    name = 'reviews'

    def __init__(self, *args, **kwargs):
        self.objects = Review.objects.visible().prefetch_related('reactions')
        return super().__init__(*args, **kwargs)

    def get_serializer(self):
        from api.reviews.serializers import ReviewFeedSerializer
        return ReviewFeedSerializer

    def get_context_params(self):
        return {'request': self.context['request'], 'comments': True, 'posts': False}


class DiscussionElement(Element):
    objects = Discussion.objects.visible()
    name = 'discussions'
    exclude = []

    def get_serializer(self):
        from api.discussions.serializers import DiscussionFeedSerializer
        return DiscussionFeedSerializer

    def get_context_params(self):
        return {'request': self.context['request'], 'comments': True, 'posts': False}


class CommentElement(GroupElement):
    name = 'comments'

    def add_groups(self, feed, group, groups, limit):
        super().add_groups(feed, group, groups, limit)
        ids = (feed.data.get('comments_parents') or {}).get(group)
        if ids:
            self.groups[feed.id][group].append(ids[0])

    def add_counts_groups(self, feed, status, count):
        super().add_counts_groups(feed, status, count)
        ids = (feed.data.get('comments_parents') or {}).get(status)
        if ids:
            self.counts_groups[feed.id][status] += 1

    def get_context(self):
        from api.discussions.serializers import CommentFeedSerializer as DiscussionSerializer
        from api.games.serializers import CollectionFeedCommentFeedSerializer
        from api.reviews.serializers import CommentFeedSerializer as ReviewSerializer

        model_serializers = {
            'commentcollectionfeed': CollectionFeedCommentFeedSerializer,
            'commentdiscussion': DiscussionSerializer,
            'commentreview': ReviewSerializer,
        }
        result = {}
        models = {}
        kwargs = {'many': True, 'context': self.context.copy()}
        # get ids for all models
        for feed_id, data in self.groups.items():
            for model, ids in data.items():
                models[model] = (models.get(model) or []) + ids
        # get all records
        for model, ids in models.items():
            self.objects = apps.get_model(app_label='comments', model_name=model).objects
            models[model] = self.objects.in_bulk(ids)
            if models[model]:
                kwargs['context'].update(self.get_additional_model_context(models[model]))
        # set results for different models
        for feed_id, data in self.groups.items():
            for model, ids in data.items():
                serializer = model_serializers.get(model)
                result[feed_id] = {
                    'count': self.counts[feed_id],
                    'results': serializer([models[model][pk] for pk in ids if models[model].get(pk)], **kwargs).data,
                }
        return result


def get_list(additional_users=None):
    return [
        ('users', 'users', UserElement, {'additional_users': additional_users}, True, True),
        ('collections', 'collections', CollectionElement, {}, True, True),
        ('collection_feeds', 'collection_feeds', CollectionFeedElement, {}, True, True),
        ('games', 'games', GameElement, {}, True, True),
        ('statuses', 'games', GameElement, {}, False, False),
        ('reviews', 'reviews', ReviewElement, {}, True, True),
        ('discussions', 'discussions', DiscussionElement, {}, True, True),
        ('comments', 'comments', CommentElement, {}, False, True),
    ]


def get_many_context(feeds, context, additional_users, limit):
    from apps.feed.models import UserReaction

    items = {}
    feed_ids = []

    for user_feed in feeds:
        feed = getattr(user_feed, 'feed', user_feed)
        feed_ids.append(feed.id)

        for name, element_name, element_class, kwargs, flat, _ in get_list(additional_users):
            data = feed.data.get(name)
            if data:
                if flat:
                    if not items.get(element_name):
                        items[element_name] = element_class(context, **kwargs)
                    items[element_name].add_items(feed, data, limit)
                else:
                    if not items.get(element_name):
                        items[element_name] = element_class(context, **kwargs)
                    for group, group_data in data.items():
                        items[element_name].add_groups(feed, group, group_data, limit)
                    items[element_name].add_items_total(feed)

    selected_reactions = UserReaction.objects \
        .filter(feed_id__in=feed_ids, user_id=context['request'].user.id) \
        .values_list('feed_id', 'reaction_id')
    reactions = {}
    for feed_id, reaction_id in selected_reactions:
        reactions.setdefault(feed_id, []).append(reaction_id)

    context.update({
        'feeds': {element.name: element.get_context() for element in items.values()},
        'feeds_reactions': reactions,
    })


def to_representation(data, context):
    for name, *_, show in get_list():
        if not show:
            continue
        elements = context['feeds'].get(name)
        if not elements:
            continue
        data[name] = elements.get(data['id'])

    if not data['reactions']:
        data['reactions'] = []
    selected = context['feeds_reactions'].get(data['id']) or []
    for reaction in data['reactions']:
        reaction['selected'] = reaction['id'] in selected

    return data
