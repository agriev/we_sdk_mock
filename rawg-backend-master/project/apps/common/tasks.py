from apps.celery import app as celery
from apps.common.models import SeoLink, SeoLinkCrawl, SeoLinkShow


@celery.task(time_limit=60, ignore_result=True)
def update_show(seo_links, on_uri, ip, user_agent):
    SeoLinkShow.objects.bulk_create([
        SeoLinkShow(seo_link_id=link_id, on_uri=on_uri, ip=ip, user_agent=user_agent) for link_id in seo_links
    ])
    for seo_link in SeoLink.objects.filter(id__in=seo_links):
        seo_link.shows_count = seo_link.shows.count()
        seo_link.cycles_count = seo_link.shows_count // SeoLink.CYCLE_SHOWS
        seo_link.save(update_fields=['shows_count', 'cycles_count'])


@celery.task(time_limit=60, ignore_result=True)
def update_crawl(uri, ip, user_agent):
    seo_link = SeoLink.objects.visible().filter(uri=uri).first()
    if seo_link:
        SeoLinkCrawl.objects.create(uri=uri, seo_link=seo_link, ip=ip, user_agent=user_agent)
        seo_link.crawls_count = seo_link.crawls.count()
        if seo_link.crawls_count > 2:
            seo_link.hidden = True
        seo_link.save(update_fields=['crawls_count', 'hidden'])


@celery.task(time_limit=60, ignore_result=True)
def update_seo_link(seo_link_id):
    try:
        seo_link = SeoLink.objects.get(id=seo_link_id)
    except SeoLink.DoesNotExist:
        return
    seo_link.shows_count = seo_link.shows.count()
    seo_link.crawls_count = seo_link.crawls.count()
    seo_link.save(update_fields=['shows_count', 'crawls_count'])
