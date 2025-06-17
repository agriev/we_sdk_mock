from django.core.management.base import BaseCommand

from apps.comments import models, tasks
from apps.comments.signals import attach_comments, attach_last_comments
from apps.utils.tasks import detect_language


class Command(BaseCommand):
    help = 'Rebuild the comments fields'
    list = [
        (models.CommentReview, models.LikeReview),
        (models.CommentCollectionFeed, models.LikeCollectionFeed),
        (models.CommentDiscussion, models.LikeDiscussion),
    ]

    def handle(self, *args, **options):
        for model, like in self.list:
            for pk, parent_id, object_id in model.objects.values_list('id', 'parent_id', 'object_id'):
                tasks.update_comments_totals(pk, parent_id, object_id, model._meta.model_name)
                tasks.update_likes_totals(pk, like._meta.model_name)
                if model in attach_comments and not parent_id:
                    tasks.update_attached(pk, object_id, model._meta.model_name)
                if model in attach_last_comments and not parent_id:
                    tasks.update_last(pk, object_id, model._meta.model_name)
                detect_language(pk, model._meta.app_label, model._meta.model_name)
        self.stdout.write(self.style.SUCCESS('OK'))
