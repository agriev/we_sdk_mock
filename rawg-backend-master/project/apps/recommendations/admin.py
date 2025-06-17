from django.contrib import admin

from apps.recommendations import models


@admin.register(models.ClassificationQueue)
class ClassificationQueueAdmin(admin.ModelAdmin):
    list_display = ('id', 'game', 'created')
    list_display_links = list_display
    raw_id_fields = ('game',)


@admin.register(models.Classification)
class ClassificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'screenshot', 'created', 'updated')
    list_display_links = list_display
    raw_id_fields = ('screenshot',)


@admin.register(models.NeighborQueue)
class NeighborQueueAdmin(admin.ModelAdmin):
    list_display = ('id', 'classification', 'network', 'created')
    list_display_links = list_display


@admin.register(models.Neighbor)
class NeighborAdmin(admin.ModelAdmin):
    list_display = ('id', 'game', 'network', 'created', 'updated')
    list_display_links = list_display
    raw_id_fields = ('game',)


@admin.register(models.ResultQueue)
class ResultQueueAdmin(admin.ModelAdmin):
    list_display = ('id', 'game', 'created')
    list_display_links = list_display
    raw_id_fields = ('game',)


@admin.register(models.UserRecommendation)
class UserRecommendationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'game', 'sources', 'created', 'updated', 'position', 'hidden', 'related_ids')
    list_display_links = list_display
    raw_id_fields = ('user', 'game')
    ordering = ('user', 'position')


@admin.register(models.UserRecommendationQueue)
class UserRecommendationQueueAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'datetime')
    list_display_links = list_display
    raw_id_fields = ('user',)


@admin.register(models.UserRecommendationDislike)
class UserRecommendationDislikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'game', 'created')
    list_display_links = list_display
    raw_id_fields = ('user', 'game')
