from dateutil.relativedelta import relativedelta
from django.contrib.auth import get_user_model
from django.db.models import CharField, Count, IntegerField, Value
from django.db.models.functions import Cast
from django.utils.timezone import now
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from reversion.models import Revision, Version

from api.leaderboard import paginations, serializers
from apps.credits.models import GamePerson
from apps.games.cache import GameEditingContentTypes, GameEditingEarliestDate
from apps.games.models import Addition, Game, GameStore, ScreenShot
from apps.utils.api import int_or_none, int_or_number
from apps.utils.dates import first_day_of_month
from apps.utils.db import join
from functions.drf import DetailPaginated


class LeaderBoardViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Revision.objects.all()
    serializer_class = serializers.LeaderBoardSerializer
    pagination_class = paginations.LeaderBoardPagination
    filter_backends = []

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        ids = {el['user'] for el in args[0]}
        if self.request.user.is_authenticated and self.request.user.id not in ids:
            ids.add(self.request.user.id)
            item = self.get_queryset().filter(user=self.request.user.id).first()
            user = {'user': self.request.user.id, 'count': 0}
            if item:
                user['count'] = item['count']
                user['position'] = self.get_queryset().filter(count__gte=item['count']).count()
            if (
                int_or_number(self.request.GET.get('page'), 1) == 1
                or (user['count'] == 0 and not self.paginator.get_next_link())
            ):
                args[0].append(user)
        kwargs['context']['users'] = get_user_model().objects.defer_all().in_bulk(ids)
        return serializer_class(*args, **kwargs)

    def get_queryset(self):
        qs = (
            super().get_queryset()
            .values('user')
            .annotate(count=Count('id', distinct=True))
            .order_by('-count')
            .exclude(user=None)
        )
        if self.action == 'list':
            date_created = first_day_of_month(now())
            self.month = int_or_none(self.request.GET.get('month')) or now().month
            if self.month:
                date_created = date_created.replace(month=self.month)
            self.year = int_or_none(self.request.GET.get('year')) or now().year
            if self.year:
                date_created = date_created.replace(year=self.year)
            date_created_end = date_created + relativedelta(months=1)
            qs = qs.filter(date_created__date__gte=date_created, date_created__date__lt=date_created_end)
        return qs

    @swagger_auto_schema(operation_summary='List The User Editing Leaderboard.')
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data['year'] = self.year
        response.data['month'] = self.month
        date_created = GameEditingEarliestDate().get()
        response.data['earliest_year'] = date_created.year
        response.data['earliest_month'] = date_created.month
        for i, row in enumerate(response.data['results']):
            if 'position' in row:
                continue
            if not row['editing_count']:
                row['position'] = response.data['count'] + 1
                continue
            row['position'] = (
                i + 1 + (
                    (int_or_number(request.GET.get('page'), 1) - 1)
                    * int_or_number(request.GET.get('page_size'), self.pagination_class.page_size)
                )
            )
        return response

    @swagger_auto_schema(operation_summary='List The User Editing Leaderboard for a Game.')
    @action(detail=False, url_path=r'games/(?P<game_id>[-_\w]+)')
    def games(self, request, game_id):
        pk = int_or_none(game_id)
        if not pk:
            pk = get_object_or_404(Game.objects.only('id'), slug=game_id).id

        types = GameEditingContentTypes().get()
        all_ids_qs = (
            Game.objects.filter(id=pk)
            .annotate(
                content_type_id=Value(types[Game].id, output_field=IntegerField()),
                object_id=Cast('id', CharField())
            )
            .values_list('content_type_id', 'object_id')
            .order_by('object_id')
            .union(
                Addition.objects.filter(parent_game_id=pk)
                .annotate(
                    content_type_id=Value(types[Addition].id, output_field=IntegerField()),
                    object_id=Cast('id', CharField())
                )
                .values_list('content_type_id', 'object_id')
                .order_by('object_id')
            )
            .union(
                GamePerson.objects.filter(game_id=pk)
                .annotate(
                    content_type_id=Value(types[GamePerson].id, output_field=IntegerField()),
                    object_id=Cast('id', CharField())
                )
                .values_list('content_type_id', 'object_id')
                .order_by('object_id')
            )
            .union(
                GameStore.objects.filter(game_id=pk)
                .annotate(
                    content_type_id=Value(types[GameStore].id, output_field=IntegerField()),
                    object_id=Cast('id', CharField())
                )
                .values_list('content_type_id', 'object_id')
                .order_by('object_id')
            )
            .union(
                ScreenShot.objects.filter(game_id=pk)
                .annotate(
                    content_type_id=Value(types[ScreenShot].id, output_field=IntegerField()),
                    object_id=Cast('id', CharField())
                )
                .values_list('content_type_id', 'object_id')
                .order_by('object_id')
            )
        )
        queryset = self.get_queryset().extra(where=[
            f'("{Version._meta.db_table}"."content_type_id", "{Version._meta.db_table}"."object_id") '
            f'in ({all_ids_qs.query})',
        ])
        join(queryset, Revision, Version, 'id', 'revision_id')

        pagination = paginations.ContributorsPagination()
        page_size = pagination.get_page_size(request)
        # if you want to paginate:
        # data = pagination.paginate_count_queryset_page(queryset, queryset.count(), request).object_list
        data = list(queryset[:page_size])
        serializer_class = serializers.ContributorsSerializer
        serializer_kwargs = {'context': self.get_serializer_context()}
        serializer_kwargs['context']['users'] = get_user_model().objects.defer_all().in_bulk({
            el['user'] for el in data
        })
        serializer_kwargs['context'].update(
            get_user_model().get_many_context(serializer_kwargs['context']['users'].values(), self.request)
        )
        response = DetailPaginated(self, pagination, serializer_class, serializer_kwargs).response(data)
        response.data['count'] = len(data)
        return response
