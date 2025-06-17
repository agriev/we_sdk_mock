from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from apps.common import models, tasks


@receiver(post_delete, sender=models.SeoLinkShow)
def seo_link_show_post_delete(instance, **kwargs):
    def on_commit():
        tasks.update_seo_link.delay(instance.seo_link_id)
    transaction.on_commit(on_commit)


@receiver(post_delete, sender=models.SeoLinkCrawl)
def seo_link_crawl_post_delete(instance, **kwargs):
    def on_commit():
        if not instance.seo_link_id:
            return
        tasks.update_seo_link.delay(instance.seo_link_id)
    transaction.on_commit(on_commit)
