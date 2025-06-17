from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.stat import serializers
from apps.stat.tasks import add_carousel_rating, add_recommended_game_store_visit, add_story


class CarouselRatingView(APIView):
    permission_classes = (AllowAny,)

    @swagger_auto_schema(
        operation_summary='Add a Rating Carousel action in statistics',
        request_body=serializers.CarouselRatingSerializer,
        responses={
            201: openapi.Response('Success'),
            400: openapi.Response('Validation Error'),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = serializers.CarouselRatingSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            add_carousel_rating.delay(
                serializer.validated_data['user_id'],
                serializer.validated_data['action'],
                serializer.validated_data['slug'],
                serializer.validated_data['rating'],
                serializer.validated_data['cid'],
                serializer.validated_data['ip'],
                serializer.validated_data['user_agent'],
            )
            return Response(status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status.HTTP_400_BAD_REQUEST)


class StoryView(APIView):
    permission_classes = (AllowAny,)

    @swagger_auto_schema(
        operation_summary='Add a Story action in statistics',
        request_body=serializers.StorySerializer,
        responses={
            201: openapi.Response('Success'),
            400: openapi.Response('Validation Error'),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = serializers.StorySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            add_story.delay(
                serializer.validated_data['cid'],
                serializer.validated_data['second'],
                serializer.validated_data['domain'],
                serializer.validated_data['ip'],
                serializer.validated_data['user_agent'],
            )
            return Response(status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status.HTTP_400_BAD_REQUEST)


class StoreVisitView(APIView):
    permission_classes = (IsAuthenticated,)

    @swagger_auto_schema(
        operation_summary='Add a Store Visit action in statistics',
        request_body=serializers.StoreVisitSerializer,
        responses={
            201: openapi.Response('Success'),
            400: openapi.Response('Validation Error'),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = serializers.StoreVisitSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            add_recommended_game_store_visit.delay(
                request.user.id,
                serializer.validated_data['game_id'],
                serializer.validated_data['store_id'],
            )
            return Response(status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status.HTTP_400_BAD_REQUEST)
