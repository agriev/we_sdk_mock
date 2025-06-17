from django.conf import settings
from django.db import connection
from django.db.models import Case, IntegerField, When, prefetch_related_objects
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.status import HTTP_404_NOT_FOUND
from rest_framework.views import Response

from api.feed import paginations, serializers
from api.functions import is_docs
from api.games.serializers import GameSerializer
from api.users.permissions import IsUserOwner
from api.views_mixins import FakePaginateMixin, GetObjectMixin, PaginateDetailRouteMixin
from apps.feed import models
from apps.games.models import Game
from apps.utils.lang import get_languages


class FeedViewSet(FakePaginateMixin, GetObjectMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet,
                  PaginateDetailRouteMixin):
    queryset = models.Feed.objects.prefetch()
    permission_classes = (IsAuthenticated,)
    serializer_class = serializers.FeedSerializer
    pagination_class = paginations.FeedPagination

    @action(detail=False, methods=['get', 'post'])
    def counters(self, request):
        if request.method == 'POST' and request.data.get('notifications'):
            models.UserNotifyFeed.objects.filter(user_id=self.request.user.id, new=True).update(new=False)
            notifications = 0
        else:
            notifications = models.UserNotifyFeed.objects.filter(user_id=self.request.user.id, new=True).count()
        return Response({
            'notifications': notifications,
            'total': notifications,
        })

    @action(detail=False)
    def notifications(self, request):
        qs = models.UserNotifyFeed.objects.prefetch().filter(user=self.request.user)
        return self.get_paginated_detail_response(qs)

    @action(detail=False)
    def explore(self, request):
        args = [self.request.user.id]
        body = '''
            FROM feed_userfeed
            INNER JOIN feed_feed ON (feed_userfeed.feed_id = feed_feed.id)
            WHERE (feed_userfeed.user_id = %s OR feed_userfeed.user_id IS NULL) AND NOT feed_userfeed.hidden
        '''
        actions = request.GET.get('actions')
        if actions:
            actions = actions.split(',')
            args += actions
            templates = ', '.join('%s' for _ in enumerate(actions))
            body += ' AND feed_feed.action IN ({})'.format(templates)
        if not self.request.user.all_languages:
            languages = get_languages(request)[0:10]
            languages.append('-')
            if settings.DEFAULT_LANGUAGE not in languages:
                languages.append(settings.DEFAULT_LANGUAGE)
            args.append('{{{}}}'.format(models.UserFeed.SOURCES_COMMON))
            args += languages
            templates = ', '.join('%s' for _ in enumerate(languages))
            body += 'AND (feed_userfeed.sources != %s OR feed_feed.language IN ({}))'.format(templates)

        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) FROM (SELECT DISTINCT feed_id {}) sub'.format(body), args)
            count = cursor.fetchone()[0]

        args = self.raw_paginate(request, count, args)
        order = 'ORDER BY rank ASC, created DESC, feed_id DESC'
        select = '''
            (RANK() OVER (PARTITION BY action ORDER BY created DESC, id DESC)) +
            GREATEST(0, TRUNC(DATE_PART('day', NOW() - created) / 7) - 3) AS rank, *
        '''
        if self.request.user.feed_chronological:
            select = '*'
            order = 'ORDER BY created DESC, feed_id DESC'
        ordering = request.GET.get('ordering')
        if ordering in ('created', '-created'):
            select = '*'
            order = 'ORDER BY created {0}, feed_id {0}'.format('DESC' if ordering[0] == '-' else 'ASC')

        # exclude duplicate Feed.ACTIONS_ADD_DISCUSSION and Feed.ACTIONS_ADD_REVIEW actions by means of
        # `DISTINCT ON (feed_userfeed.feed_id)` because all users have popular discussions and reviews
        # in their feeds with user_id = None
        rows = list(models.UserFeed.objects.raw('''
            SELECT {}
            FROM (
                SELECT
                    DISTINCT ON (feed_userfeed.feed_id)
                    feed_userfeed.id,
                    feed_userfeed.user_id,
                    feed_userfeed.feed_id,
                    feed_userfeed.created,
                    feed_userfeed.new,
                    feed_userfeed.sources,
                    feed_feed.action
                {}
                ORDER BY feed_userfeed.feed_id ASC, feed_userfeed.user_id DESC NULLS LAST
            ) sub
            {}
            LIMIT %s OFFSET %s
        '''.format(select, body, order), args))

        prefetch_related_objects(rows, 'feed', 'feed__user')
        serializer = self.get_serializer(rows, many=True, context=self.get_serializer_context())
        return self.get_paginated_response(serializer.data)

    @action(detail=False, permission_classes=[IsAuthenticatedOrReadOnly])
    def reactions(self, request):
        items = self.get_serializer(models.Reaction.objects.all(), many=True).data
        return Response({
            'count': len(items),
            'results': items,
        })

    @action(detail=False, permission_classes=[IsAuthenticatedOrReadOnly])
    def posts(self, request):
        return self.get_paginated_detail_response(models.Feed.objects.prefetch().filter(
            action__in=(models.Feed.ACTIONS_ADD_REVIEW, models.Feed.ACTIONS_ADD_DISCUSSION),
            user__isnull=False,
        ))

    @action(detail=True, methods=['post'])
    def hide(self, request, pk):
        feed = self.get_object()
        try:
            user_feed = models.UserFeed.objects.get(feed=feed, user=request.user)
        except models.UserFeed.DoesNotExist:
            return Response(status=HTTP_404_NOT_FOUND)
        user_feed.hidden = not user_feed.hidden
        user_feed.save(update_fields=['hidden'])
        return Response({
            'feed': feed.id,
        })

    @action(detail=True)
    def games(self, request, pk):
        feed = self.get_object()
        ids = feed.data.get('games')
        if feed.action == feed.ACTIONS_MARK_GAME:
            ids = list(feed.data.get('statuses').values()).pop()
        games = []
        if ids:
            cases = [When(id=pk, then=i) for i, pk in enumerate(ids)]
            position = Case(*cases, default=len(ids), output_field=IntegerField())
            games = Game.objects.defer_all().filter(id__in=ids).annotate(position=position).order_by('position')
        return self.get_paginated_detail_response(games)

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        is_request = not is_docs(kwargs)
        kwargs['context'] = self.get_serializer_context()
        if self.action in ('notifications', 'explore', 'posts'):
            additional = None
            if self.action == 'explore':
                serializer_class = serializers.UserFeedSerializer
                additional = [feed.feed.user for feed in args[0] if feed.feed.user]
            elif self.action == 'notifications':
                serializer_class = serializers.UserNotifyFeedSerializer
                additional = [feed.feed.user for feed in args[0] if feed.feed.user]
            elif self.action == 'posts':
                additional = [feed.user for feed in args[0] if feed.user]
            models.Feed.get_many_context(args[0], kwargs['context'], additional)
        elif self.action == 'retrieve' and is_request:
            self.get_object().get_context(kwargs['context'])
        elif self.action == 'reactions':
            serializer_class = serializers.ReactionSerializer
        elif self.action == 'games':
            serializer_class = GameSerializer
            kwargs['context'].update(Game.get_many_context(args[0], self.request))
        return serializer_class(*args, **kwargs)


class ReactionViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = models.Reaction.objects.all()
    serializer_class = serializers.ReactionSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), id=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj


class UserReactionViewSet(mixins.CreateModelMixin, mixins.DestroyModelMixin, mixins.ListModelMixin,
                          viewsets.GenericViewSet):
    queryset = models.UserReaction.objects.prefetch_related('user')
    serializer_class = serializers.UserReactionSerializer
    permission_classes = (IsAuthenticated, IsUserOwner)
    pagination_class = paginations.ReactionPagination
    filter_backends = []

    def get_object(self):
        obj = get_object_or_404(
            self.get_queryset(), feed_id=self.kwargs['feed_pk'],
            reaction_id=self.kwargs['reaction_pk'], user_id=self.kwargs['pk']
        )
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        if self.action == 'list':
            position = Case(When(user_id=self.request.user.id, then=0), default=1, output_field=IntegerField())
            return self.queryset \
                .filter(reaction_id=self.kwargs['reaction_pk'], feed_id=self.kwargs['feed_pk']) \
                .annotate(position=position).order_by('position', '-id')
        return super().get_queryset()
