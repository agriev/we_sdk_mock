from datetime import datetime
from typing import List

from attr import dataclass
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.syndication.views import Feed
from django.db.models import Prefetch
from django.utils import feedgenerator
from django.utils.feedgenerator import Rss201rev2Feed
from lxml import etree, html
from lxml.html import fromstring, tostring

from apps.common.cache import CommonContentType
from apps.discussions.models import Discussion
from apps.games.models import Collection, CollectionGame, Game
from apps.reviews.models import Review
from apps.utils.dicts import find
from apps.utils.strings import keep_tags

MAX_DESCRIPTION_LENGTH = 10000


@dataclass
class ZenItem:
    title: str
    link: str
    pub_date: datetime
    author: str
    enclosures: List[str]
    content_encoded: str
    short_description: str
    media_rating: str = 'nonadult'
    categories: List[str] = ['Игры']


class ZenTypeFeed(Rss201rev2Feed):
    def write_items(self, handler):
        for item in self.items:
            item['enclosures_all'] = item['enclosures']
            item['enclosures'] = None
            handler.startElement('item', self.item_attributes(item))
            self.add_item_elements(handler, item)
            handler.endElement('item')

    def add_item_elements(self, handler, item):
        super().add_item_elements(handler, item)

        handler.addQuickElement('author', item['author'])
        if 'media_rating' in item:
            handler.addQuickElement('media:rating', item['media_rating'])

        if item['enclosures_all']:
            enclosures = list(item['enclosures_all'])
            for enclosure in enclosures:
                handler.addQuickElement('enclosure', '', {
                    'url': enclosure.url,
                    'type': enclosure.mime_type,
                })

        if 'content_encoded' in item:
            handler.startElement('content:encoded', {})
            handler._write(f'<![CDATA[\n{item["content_encoded"]}\n]]>')
            handler.endElement('content:encoded')

        if 'short_description' in item:
            handler.startElement('description', {})
            handler._write(f'<![CDATA[\n{item["short_description"]}\n]]>')
            handler.endElement('description')

    def add_root_elements(self, handler):
        self.feed['language'] = settings.LANGUAGE_RU
        self.feed['feed_url'] = None
        super().add_root_elements(handler)


class ZenFeed(Feed):
    feed_type = ZenTypeFeed
    title = 'AG.ru — Твоя игротека'
    link = 'https://ag.ru/'
    description = 'Новости, коллекции и обзоры видеоигр'
    default_img = 'https://api.ag.ru/static/assets/default_enclousure.jpg'
    one_image_min = False

    def filter(self, qs):
        # todo created__gt=yesterday(days=30), language=settings.LANGUAGE_RUS
        # and then todo created__gt=yesterday(days=4), language=settings.LANGUAGE_RUS
        return qs.order_by('-created').filter(is_zen=True)

    def items(self):
        data = []

        reviews = self.filter(
            Review.objects.visible().filter(is_text=True)
            .prefetch_related(
                Prefetch('game', queryset=Game.objects.only('name', 'image', 'image_background')),
                Prefetch('user', queryset=get_user_model().objects.only('full_name', 'username')),
            )
        )
        for review in reviews:
            one_image = review.game.background_image_full or self.default_img if self.one_image_min else ''
            text, enclosures = rss_text(review.text_safe, one_image)
            title = review.title or f'Обзор игры {review.game.name}'
            data.append(ZenItem(
                title=title,
                link=review.get_absolute_url(),
                pub_date=review.created,
                author=review.user.full_name or review.user.username,
                enclosures=enclosures,
                content_encoded=text,
                short_description=review.text_bare[:MAX_DESCRIPTION_LENGTH] or title,
            ))

        discussions = self.filter(
            Discussion.objects.visible()
            .prefetch_related(
                Prefetch('game', queryset=Game.objects.only('name', 'image', 'image_background')),
                Prefetch('user', queryset=get_user_model().objects.only('full_name', 'username')),
            )
        )
        for discussion in discussions:
            one_image = discussion.game.background_image_full or self.default_img if self.one_image_min else ''
            text, enclosures = rss_text(discussion.text_safe, one_image)
            title = discussion.title or f'Комментарий об игре {discussion.game.name}'
            data.append(ZenItem(
                title=title,
                link=discussion.get_absolute_url(),
                pub_date=discussion.created,
                author=discussion.user.full_name or discussion.user.username,
                enclosures=enclosures,
                content_encoded=text,
                short_description=discussion.text_bare[:MAX_DESCRIPTION_LENGTH] or title,
            ))

        collections = self.filter(
            Collection.objects.all()
            .prefetch_related(
                'collectionfeed_set',
                'collectiongame_set',
                Prefetch('creator', queryset=get_user_model().objects.only('full_name', 'username')),
            )
        )
        object_to_game = {}
        games_ids = set()
        for collection in collections:
            for collection_game in collection.collectiongame_set.all():
                games_ids.add(collection_game.game_id)
                object_to_game[collection_game.id] = collection_game.game_id
        games = Game.objects.only('name', 'image', 'image_background', 'clip_json').in_bulk(games_ids)
        for collection in collections:
            enclosures = []
            all_img_enclosures = []
            text = f'{collection.description}\n\n'
            for feed in collection.collectionfeed_set.all():
                if feed.content_type_id != CommonContentType().get(CollectionGame).id:
                    continue
                game = games.get(object_to_game.get(feed.object_id))
                if not game:
                    continue

                part_text = ''
                part_enclosures = []
                if feed.text_safe:
                    part_text, part_enclosures = rss_text(feed.text_safe, '')

                clip_text = ''
                clip_enclosures = []
                clip_full = find(game.clip_json, 'clips.full')
                if clip_full:
                    clip_text = f'<figure><video><source src="{clip_full}" type="video/mp4"></video></figure>\n\n'
                    clip_enclosures.append(clip_full)

                img_text = ''
                img_enclosures = []
                if game.background_image_full:
                    img_text = f'<figure><img src="{game.background_image_full}"></figure>\n\n'
                    img_enclosures.append(game.background_image_full)
                    all_img_enclosures.append(game.background_image_full)

                text += f'{game.name}\n\n'
                if not part_enclosures:
                    if clip_text:
                        text += clip_text
                        part_enclosures += clip_enclosures
                        if self.one_image_min:
                            part_enclosures += img_enclosures
                    elif img_text:
                        text += img_text
                        part_enclosures += img_enclosures
                else:
                    enclosures += part_enclosures
                if part_text:
                    text += f'{part_text}\n\n'
            if (
                self.one_image_min
                and (not enclosures or not max(enc.endswith('.jpg') or enc.endswith('.png') for enc in enclosures))
            ):
                enclosures = all_img_enclosures or [self.default_img]
            data.append(ZenItem(
                title=collection.name,
                link=collection.get_absolute_url(),
                pub_date=collection.created,
                author=collection.creator.full_name or collection.creator.username,
                enclosures=enclosures,
                content_encoded=text,
                short_description=collection.description[:MAX_DESCRIPTION_LENGTH] or collection.name,
            ))
        return sorted(data, key=lambda el: el.pub_date, reverse=True)

    def item_title(self, item: ZenItem) -> str:
        return super().item_title(item.title)

    def item_description(self, item):
        return None

    def item_link(self, item: ZenItem) -> str:
        return item.link

    def item_pubdate(self, item: ZenItem) -> datetime:
        return item.pub_date

    def item_categories(self, item: ZenItem) -> List[str]:
        return item.categories

    def item_enclosures(self, item: ZenItem) -> List[feedgenerator.Enclosure]:
        enclosures = []
        for el in item.enclosures:
            enclosures.append(feedgenerator.Enclosure(
                url=el,
                mime_type=self.item_enclosure_mime_type(el),
                length='',
            ))
        return enclosures

    def item_extra_kwargs(self, item: ZenItem):
        return {
            'content_encoded': item.content_encoded,
            'media_rating': item.media_rating,
            'author': item.author,
        }

    def item_enclosure_mime_type(self, url: str) -> str:
        url = url.lower()
        if url.endswith('.jpg') or url.endswith('.jpeg'):
            return 'image/jpeg'
        if url.endswith('.png'):
            return 'image/png'
        if url.endswith('.gif'):
            return 'image/gif'
        return 'video/mp4'


class MailTypeFeed(ZenTypeFeed):
    logo = 'https://api.ag.ru/static/assets/logo_ag.png'

    def add_root_elements(self, handler):
        handler.startElement('image', {})
        handler._write(f'<url>{self.logo}</url>')
        handler.endElement('image')
        super().add_root_elements(handler)


class MailFeed(ZenFeed):
    feed_type = MailTypeFeed
    one_image_min = True

    def item_extra_kwargs(self, item: ZenItem):
        data = super().item_extra_kwargs(item)
        del data['content_encoded'], data['media_rating']
        data['short_description'] = item.short_description
        return data


def rss_text(text, one_image_min=''):
    dom = fromstring(f'<article>{text}</article>')

    etree.strip_elements(dom, 'figure', 'video', 'source', with_tail=False)

    enclosure = []
    is_image = False
    for div in dom.cssselect('div'):
        if div.getchildren() and div.getchildren()[0].getchildren():
            element = div.getchildren()[0].getchildren()[0]
            tag = element.tag
            if tag in ('img', 'iframe'):
                src = element.attrib['src']
                enclosure.append(src)
                if tag == 'img':
                    new_el = f'<figure><img src="{src}"></figure>'
                    is_image = True
                else:
                    new_el = f'<figure><video><source src="{src}" type="video/mp4"></video></figure>'
                div.getparent().replace(div, html.fragment_fromstring(new_el))
                continue
    if not is_image and one_image_min:
        enclosure.append(one_image_min)

    for el in dom.xpath('/article/img'):
        el.parent().remove(el)

    for el in dom.cssselect('br'):
        el.tail = '\n' + el.tail if el.tail else '\n'
    etree.strip_elements(dom, 'br', with_tail=False)

    text = keep_tags(
        tostring(dom, encoding='utf-8', pretty_print=True).decode('utf-8'),
        allow_tags=('p', 'span', 'figure', 'img', 'video', 'source'),
        kill_tags=('embed', 'iframe'),
        safe_attrs=('src', 'type'),
        replace_allow_tags=True,
        replace_kill_tags=True,
    )

    return text, enclosure
