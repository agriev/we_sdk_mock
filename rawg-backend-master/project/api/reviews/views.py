from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Prefetch, Q
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import Response

from api.comments.views import BaseCommentViewSet, BaseLikeViewSet
from api.functions import is_docs
from api.games.serializers import GameSerializer, GameShortSerializer
from api.reviews import paginations, serializers
from api.users.permissions import IsUserOwner, IsUserOwnerOrAdmin
from api.views_mixins import DisablePutMixin, GetObjectMixin, PaginateDetailRouteMixin
from apps.comments.models import CommentReview, LikeReview
from apps.games.models import Game
from apps.reviews import models, seo
from apps.reviews.tasks import save_reviews
from apps.users.models import UserGame
from apps.users.tasks import add_games_to_library
from apps.utils.api import true
from apps.utils.decorators import headers
from apps.utils.lang import get_languages_condition


class ReviewViewSet(GetObjectMixin, DisablePutMixin, viewsets.ModelViewSet, PaginateDetailRouteMixin):
    queryset = models.Review.objects.visible().prefetch_related(
        Prefetch('user', queryset=get_user_model().objects.defer_all())
    )
    permission_classes = (IsUserOwnerOrAdmin,)
    serializer_class = serializers.ReviewSerializer
    pagination_class = paginations.ReviewPagination

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        is_request = not is_docs(kwargs)
        kwargs['context'] = self.get_serializer_context()
        if self.action == 'retrieve' and is_request:
            serializer_class = serializers.ReviewSingleMainSerializer
            kwargs['context'].update(self.get_object().get_context(self.request))
        if self.action in ('main', 'list', 'popular'):
            serializer_class = serializers.ReviewMainSerializer
            kwargs['context'].update(models.Review.get_many_context(args[0], self.request))
        return serializer_class(*args, **kwargs)

    def get_queryset(self):
        if self.action == 'list':
            qs = models.Review.objects.list()
            if not self.request.user.is_authenticated:
                qs = qs.filter(language=self.request.LANGUAGE_CODE_ISO3)
            return qs
        elif self.action == 'retrieve':
            return self.queryset.prefetch_related(Prefetch('game', queryset=Game.objects.defer_all()))
        return super().get_queryset()

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        if self.request.GET.get('ordering') in ('-created', 'created'):
            qs = qs.annotate(lang=get_languages_condition(self.request)).order_by('lang', '-created')
        return qs

    def create(self, request, *args, **kwargs):
        if request.data and 'games' in request.data:
            return self.bulk_post(request)
        return super().create(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        response.data.update(seo.review(self.get_object(), request))
        return response

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.game.append_rating(instance.rating, minus=True)
        self.perform_destroy(instance)
        return Response(
            {'game': GameShortSerializer(instance.game, context=self.get_serializer_context()).data},
            status=status.HTTP_202_ACCEPTED
        )

    @transaction.atomic
    def bulk_post(self, request, *args, **kwargs):
        games = request.data.get('games')
        if not games:
            return Response(status=status.HTTP_200_OK)
        add_to_library = request.data.get('add_to_library')
        if add_to_library:
            for game in games:
                game['add_to_library'] = True
        save_reviews.delay(games, user_id=self.request.user.pk)
        if add_to_library:
            for game in games:
                add_games_to_library.delay(
                    self.request.user.pk,
                    game['game']
                )
        return Response(
            {},
            status=status.HTTP_201_CREATED
        )

    @transaction.atomic
    def perform_create(self, serializer):
        super().perform_create(serializer)

    @transaction.atomic
    def perform_update(self, serializer):
        super().perform_update(serializer)

    @transaction.atomic
    def perform_destroy(self, instance):
        instance.hidden = True
        instance.save()

    @method_decorator([headers({'X-Accel-Expires': 3600 * 24}), cache_page(3600 * 24)])
    @action(detail=False)
    def ratings(self, request):
        ratings = models.Review.RATINGS
        return Response({
            'count': len(ratings),
            'results': [{'id': rating, 'title': title, 'positive': rating > 3} for rating, title in ratings],
        })

    @method_decorator([
        headers({'X-Accel-Expires': 3600}),
        vary_on_headers('X-Api-Language', 'Host', 'Origin'),
        cache_page(3600),
    ])
    @action(detail=False)
    def reactions(self, request):
        reactions = models.Reaction.objects.all()
        positive = 'positive' in self.request.GET
        if positive:
            reactions = reactions.filter(positive=true(self.request.GET.get('positive')))
        return Response({
            'count': len(reactions),
            'results':
                serializers.ReactionSerializer(reactions, many=True, context=self.get_serializer_context()).data,
        })

    @action(detail=False, url_path='lists/main')
    def main(self, request):
        # todo replace by popular
        return self.popular(request)

    @action(detail=False, url_path='lists/popular')
    def popular(self, request):
        self.pagination_class = paginations.ReviewMainPagination
        return self.get_paginated_detail_response(
            models.Review.objects.popular(request), count_queryset=models.Review.objects.popular_count(request)
        )


class LikeViewSet(mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = models.Like.objects.all()
    serializer_class = serializers.LikeSerializer
    permission_classes = (IsUserOwner,)

    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), review_id=self.kwargs['review_pk'], user_id=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj


class CommentViewSet(BaseCommentViewSet):
    queryset = CommentReview.objects.all()
    serializer_class = serializers.CommentSerializer


class CommentLikeViewSet(BaseLikeViewSet):
    queryset = LikeReview.objects.all()
    serializer_class = serializers.CommentLikeSerializer


class ReviewCarouselBaseViewSet(mixins.ListModelMixin, viewsets.GenericViewSet, PaginateDetailRouteMixin):
    pagination_class = paginations.ReviewCarouselPagination


class ReviewCarouselViewSet(ReviewCarouselBaseViewSet):
    queryset = UserGame.objects.visible().prefetch_related(
        Prefetch('game', queryset=Game.objects.defer_all())
    )
    serializer_class = serializers.ReviewCarouselSerializer
    pagination_class = paginations.ReviewCarouselPagination
    permission_classes = (IsAuthenticated,)
    filter_backends = ()

    def get_queryset(self):
        user = self.request.user
        review_ids = models.Review.objects.visible().filter(
            user=user).values_list('game_id', flat=True)

        return super().get_queryset() \
            .filter(user=user) \
            .exclude(Q(status__in=['yet', 'toplay']) | Q(game_id__in=review_ids)) \
            .order_by(F('last_played').desc(nulls_last=True), '-added')

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data.update({
            'total_games': request.user.get_real_user_games_count(),
            'top_games': False
        })
        return response


class Top100ReviewCarouselViewSet(ReviewCarouselBaseViewSet):
    queryset = models.Game.objects.defer_all() \
        .filter(released__isnull=False, tba=False) \
        .order_by('-weighted_rating', '-id')
    serializer_class = GameSerializer
    pagination_class = paginations.ReviewTop100CarouselPagination

    def get_queryset(self):
        queryset = super().get_queryset().exclude(parents_count__gt=0)
        if not self.request.user.is_anonymous:
            top_100_ids = queryset[:100].values_list('id')
            reviews = models.Review.objects.visible().filter(user=self.request.user).values_list('game_id', flat=True)
            return queryset.filter(id__in=top_100_ids).exclude(id__in=reviews)
        return queryset[:100]

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data.update({'total_games': 100})
        if not self.request.user.is_anonymous:
            response.data['count'] = len(response.data.get('results', []))
        return response
