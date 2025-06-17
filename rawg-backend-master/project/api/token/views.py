from collections import OrderedDict
from hashlib import sha1

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import EmptyResultSet
from django.db import connection, transaction
from django.db.models import Case, Count, F, Prefetch, Q, When, Window
from django.db.models.functions import RowNumber
from django.http import Http404, HttpResponseForbidden, HttpResponseRedirect
from django.utils.functional import cached_property
from django.utils.timezone import now
from rest_framework import mixins, status, viewsets
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.token import paginations, serializers
from api.users.serializers import UserSerializer
from api.views_mixins import FakePaginateMixin
from apps.achievements.models import ParentAchievement, ParentAchievementGame, UserAchievement
from apps.games.models import Game
from apps.token import models
from apps.token.signals import user_joined
from apps.users.models import User, UserGame
from apps.utils.api import int_or_number, true


class CycleView(APIView):
    def get(self, request, *args, **kwargs):
        cycle = models.Cycle.objects.current()
        if not cycle:
            return Response(status=status.HTTP_404_NOT_FOUND)
        data = serializers.CycleSerializer(cycle, context=self.get_renderer_context()).data

        data['stages'] = cycle.get_stages()
        data['next'] = None
        cycle_next = models.Cycle.objects.next()
        if cycle_next:
            data['next'] = serializers.CycleSerializer(cycle_next, context=self.get_renderer_context()).data
            if request.user.is_authenticated:
                data['next']['subscribed'] = bool(
                    models.Subscription.objects.filter(user=self.request.user, cycle=cycle_next).count()
                )

        users = get_user_model().objects.defer_all().filter(token_program=True)
        data['joined'] = users.count()

        ordered_users = users.order_by('-token_program_joined')

        if request.user.is_authenticated:
            try:
                cycle_user = models.CycleUser.objects.get(user_id=request.user.id, cycle_id=cycle.id)
                ordered_users = users.annotate(
                    custom_ordering=Case(
                        When(~Q(avatar__exact=''), then='username')
                    )
                ).order_by('custom_ordering')
            except models.CycleUser.DoesNotExist:
                cycle_user = models.CycleUser()
                cycle_user.cycle = cycle
            data['current_user'] = serializers.CycleUserSerializer(
                cycle_user, context=self.get_renderer_context()
            ).data
            data['current_user']['top'] = cycle_user.top
            data['current_user']['is_new'] = False

        data['last_users'] = UserSerializer(
            ordered_users[0:5],
            context=self.get_renderer_context(),
            many=True,
        ).data

        return Response(data)


class JoinView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        if not self.request.user.has_game_accounts:
            return Response(
                {'error': 'You do not have game accounts', 'code': 1},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not self.request.user.has_confirmed_accounts:
            return Response(
                {'error': 'You do not have confirmed game accounts', 'code': 2},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not self.request.user.is_confirmed:
            return Response(
                {'error': 'Please, confirm your email address', 'code': 3},
                status=status.HTTP_400_BAD_REQUEST
            )
        request.user.token_program = True
        with transaction.atomic():
            request.user.save(update_fields=['token_program'])
            user_joined.send(sender=request.user.__class__, instance=request.user)
        return Response({'user': self.request.user.id}, status=status.HTTP_200_OK)


class CycleMixin:
    @cached_property
    def cycle(self):
        return models.Cycle.objects.current()

    @cached_property
    def cycle_id(self):
        return self.cycle.id if self.cycle else None


class CycleKarmaViewSet(CycleMixin, FakePaginateMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = models.CycleKarma.objects.all()
    serializer_class = serializers.CycleKarmaSerializer
    pagination_class = paginations.CycleKarmaPagination
    permission_classes = (IsAuthenticated,)
    joins = {
        'achievements_achievement':
            'LEFT JOIN achievements_achievement ON '
            '(achievements_achievement.parent_id = token_cyclekarma.parent_achievement_id)',
        'achievements_parentachievement':
            'LEFT JOIN achievements_parentachievement ON '
            '(achievements_parentachievement.id = token_cyclekarma.parent_achievement_id)',
        'achievements_userachievement':
            'LEFT JOIN achievements_userachievement ON '
            '(achievements_userachievement.achievement_id = achievements_achievement.id)',
        'games_game':
            'LEFT JOIN games_game ON (games_game.id = achievements_parentachievement.game_id)',
    }

    def list(self, request, *args, **kwargs):
        if not self.cycle:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        queryset = self.get_queryset()
        joins = OrderedDict([
            ('achievements_achievement', self.joins['achievements_achievement']),
            ('achievements_userachievement', self.joins['achievements_userachievement']),
        ])
        body = '''
            FROM token_cyclekarma {}
            WHERE {}
            GROUP BY token_cyclekarma.parent_achievement_id, token_cyclekarma.karma, token_cyclekarma.is_new
        '''.format(
            ' '.join(joins.values()),
            'token_cyclekarma.cycle_id = %s AND token_cyclekarma.user_id = %s'
        )
        args = [self.cycle.id, self.request.user.id]

        # total count

        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) FROM (SELECT COUNT(*) {}) subquery'.format(body), args)
            count = cursor.fetchone()[0]

        # pagination

        args = self.raw_paginate(request, count, args)
        joins = OrderedDict([
            ('achievements_parentachievement',
             self.joins['achievements_parentachievement'].replace('token_cyclekarma.', 'subquery.')),
            ('games_game', self.joins['games_game']),
        ])
        sql = '''
            SELECT
                subquery.parent_achievement_id as id,
                achievements_parentachievement.name,
                achievements_parentachievement.percent,
                subquery.networks,
                subquery.descriptions,
                subquery.images,
                subquery.image_sources,
                subquery.achieved,
                subquery.karma,
                subquery.is_new,
                games_game.name AS game_name,
                games_game.slug AS game_slug,
                games_game.id AS game_id
            FROM (
                SELECT
                    token_cyclekarma.parent_achievement_id,
                    token_cyclekarma.karma,
                    token_cyclekarma.is_new,
                    array_agg(achievements_achievement.network_id) AS networks,
                    array_agg(achievements_achievement.description) AS descriptions,
                    array_agg(achievements_achievement.image_file) AS images,
                    array_agg(achievements_achievement.image_source) AS image_sources,
                    MAX(achievements_userachievement.achieved) AS achieved
                {}
                ORDER BY achieved DESC NULLS LAST
                LIMIT %s OFFSET %s
            ) subquery
            {}
            ORDER BY subquery.achieved DESC NULLS LAST
        '''.format(body, ' '.join(joins.values()))
        rows = list(queryset.raw(sql, args))
        serializer = self.get_serializer(
            rows,
            many=True,
            context=self.get_serializer_context()
        )
        data = self.get_paginated_response(serializer.data)

        queryset.filter(is_new=True).update(is_new=False)
        return data


class CycleKarmaLastView(RetrieveAPIView):
    serializer_class = serializers.CycleKarmaLastSerializer

    def get_object(self):
        cycle_karma = models.CycleKarma.objects.all().last()
        if not cycle_karma:
            raise Http404
        return cycle_karma


class GamesViewSet(CycleMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Game.objects.defer_all(exclude_fields=['parent_achievements_count_all'])
    serializer_class = serializers.GameSerializer
    pagination_class = paginations.GamePagination
    permission_classes = (IsAuthenticated,)
    filter_backends = []

    @cached_property
    def playing_qs(self):
        return UserGame.objects.visible().filter(
            user=self.request.user,
            status=UserGame.STATUS_PLAYING,
            game__parent_achievements_count_all__gt=0
        )

    @cached_property
    def playing_count(self):
        return self.playing_qs.count()

    @cached_property
    def games_counts(self):
        parent_ids = (
            UserAchievement.objects.filter(user_id=self.request.user.id).exclude(achievement__parent__game_id=None)
            .values_list('achievement__parent_id', flat=True)
        )
        return (
            ParentAchievement.objects.filter(id__in=parent_ids)
            .values('game_id', 'game__parent_achievements_count_all')
            .annotate(count=Count('id')).order_by('-count')
        )

    @cached_property
    def exclude_games(self):
        return self.games_counts.filter(game__parent_achievements_count_all=F('count'))

    def get_queryset(self):
        if self.playing_count:
            qs = self.request.user.games \
                .defer_all(exclude_fields=['parent_achievements_count_all']) \
                .filter(id__in=self.playing_qs.values_list('game_id', flat=True))
        else:
            qs = (
                self.queryset.order_by('-released')
                .filter(parent_achievements_count_all__gt=0)
                .exclude(Q(released__gt=now()) | Q(tba=True))
            )
        # exclude games where a user has all achievements
        if self.exclude_games:
            qs = qs.exclude(id__in=(row['game_id'] for row in self.exclude_games))
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        games = {row['game_id']: row for row in self.games_counts}
        page_game_ids = [row['id'] for row in response.data['results']]
        exclude = list(
            UserAchievement.objects
            .filter(user_id=self.request.user.id, achievement__parent__game_id__in=page_game_ids)
            .values_list('achievement__parent_id', flat=True)
        )
        try:
            parent_achievements = (
                ParentAchievement.objects.filter(game_id__in=page_game_ids).exclude(id__in=exclude)
                .annotate(
                    rank=Window(expression=RowNumber(), order_by=F('percent').desc(), partition_by=[F('game_id')])
                )
            )
            parent_achievements = list(ParentAchievementGame.objects.raw(
                'SELECT * FROM ({}) subquery WHERE subquery.rank <= 3'.format(parent_achievements.query))
            )
        except EmptyResultSet:
            parent_achievements = []
        achievements = {}
        for parent in parent_achievements:
            achievements.setdefault(parent.game_id, []).append(parent)
        for row in response.data['results']:
            row['percent'] = 0
            if row['parent_achievements_count_all']:
                count = (games.get(row['id'], {})).get('count') or 0
                row['percent'] = int(count / (row['parent_achievements_count_all'] / 100))
                # todo optimize sql queries
                row['achievements'] = serializers.ParentAchievementSerializer(
                    achievements.get(row['id']) or [],
                    context=self.get_serializer_context(),
                    many=True,
                ).data
        return response


class CycleUserViewSet(CycleMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = models.CycleUser.objects
    serializer_class = serializers.CycleUserListSerializer
    pagination_class = paginations.CycleUserPagination

    @cached_property
    def from_current(self):
        return self.request.user.is_authenticated and self.request.user.token_program and self.cycle_user and \
            true(self.request.GET.get('from_current')) and self.more_than

    @cached_property
    def cycle_user(self):
        return models.CycleUser.objects.only('karma', 'user_id', 'cycle_id').get_or_create(
            user_id=self.request.user.id, cycle_id=self.cycle_id
        )[0]

    @cached_property
    def more_than(self):
        try:
            return super().get_queryset().filter(
                cycle_id=self.cycle_id, karma__gte=self.cycle_user.karma
            ).only('karma', 'user_id', 'cycle_id').reverse()[3]
        except IndexError:
            return None

    def get_queryset(self):
        qs = super().get_queryset().filter(cycle_id=self.cycle_id)
        if self.from_current:
            qs = qs.filter(karma__lte=self.more_than.karma)
        return qs.prefetch_related(Prefetch('user', queryset=get_user_model().objects.defer_all()))

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        page = int_or_number(self.request.GET.get('page', 1), 1) - 1
        page_size = self.paginator.get_page_size(request)
        for i, row in enumerate(response.data['results']):
            row['position'] = page * page_size + i + 1 + (self.more_than.position - 1 if self.from_current else 0)
        return response


class RewardView(CycleMixin, APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        try:
            cycle_user = models.CycleUser.objects.get(user_id=request.user.id, cycle_id=self.cycle_id)
        except models.CycleUser.DoesNotExist:
            cycle_user = models.CycleUser()
        if not self.cycle:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'your_top': cycle_user.top,
            'tokens': self.cycle.achieved_tokens_count,
            'users': models.CycleUser.objects.filter(karma__gt=0).count(),
            'exchange_until': self.cycle.exchange_until,
            'your_karma': cycle_user.karma,
            'your_tokens': cycle_user.get_tokens_count(self.cycle.achieved_tokens_count),
        })

    def post(self, request, *args, **kwargs):
        try:
            cycle_user = models.CycleUser.objects.get(user_id=request.user.id, cycle_id=self.cycle_id)
        except models.CycleUser.DoesNotExist:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        result = cycle_user.exchange_karma()
        if not result:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'your_karma': cycle_user.karma,
            'your_tokens': result
        })


class SubscribeView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        cycle = models.Cycle.objects.next()
        if not cycle or not self.request.user.token_program:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        models.Subscription.objects.get_or_create(cycle=cycle, user=self.request.user)
        return Response({'user': self.request.user.id}, status=status.HTTP_200_OK)


class UnsubscribeView(APIView):
    """View for unsubscribing in different stages of the cycle."""
    success_unsubscribe_url = 'https://ag.ru/unsubscribe?slug={mail_slug}'

    def is_correct_hash(self, request):
        """Checks that received hash is similar with the generated."""
        email = request.GET.get('email')
        requested_hash = request.GET.get('hash')
        security_hash = sha1('{}.{}'.format(email, settings.SECRET_KEY).encode('utf-8')).hexdigest()
        return requested_hash == security_hash

    def cycle_is_started(self, request):
        """Delete subscribe entry from cycle_is_started message."""
        user_id = request.GET.get('user_id')
        models.Subscription.objects.filter(user_id=user_id).delete()
        return

    def cycle_is_finished(self, request):
        """Changes value of the subscribe_mail_token field for unsubscribing."""
        user_id = request.GET.get('user_id')
        user = User.objects.get(id=user_id)
        user.subscribe_mail_token = False
        user.save()
        return

    def handle_mail_slug(self, slug, request):
        """Calls particular method depends on received slug."""
        if slug == 'cycle_is_started':
            self.cycle_is_started(request)
        elif slug == 'cycle_is_failed' or slug == 'cycle_is_finished' or slug == 'exchange_karma':
            self.cycle_is_finished(request)

        return HttpResponseRedirect(self.success_unsubscribe_url.format(mail_slug=slug))

    def get(self, request, *args, **kwargs):
        if not self.is_correct_hash(request):
            return HttpResponseForbidden()

        slug = request.GET.get('slug')
        return self.handle_mail_slug(slug, request)
