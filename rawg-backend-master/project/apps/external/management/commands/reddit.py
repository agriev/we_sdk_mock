import feedparser
from bulk_update.helper import bulk_update
from django.conf import settings
from django.core.management.base import BaseCommand
from lxml import etree, html

from apps.external.models import Reddit
from apps.games.models import Game
from apps.utils.exceptions import capture_exception


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('-g', '--game_id', action='store', dest='game_id', default=0, type=int)

    def handle(self, *args, **options):
        if not options['game_id']:
            self.clear()
        try:
            self.run(options)
        except Exception as e:
            capture_exception(e)
            self.stdout.write(self.style.ERROR('Reddit: {}'.format(e)))
        self.stdout.write(self.style.SUCCESS('Reddit: OK'))

    def run(self, options):
        fields = ('reddit_url', 'reddit_name', 'reddit_description', 'reddit_logo', 'reddit_count')
        qs = Game.objects.exclude(reddit_url='')
        if options['game_id']:
            qs = qs.filter(id=options['game_id'])
        total = qs.count()
        for i, game in enumerate(qs.only('id', *fields, 'added')):
            if not game.reddit_url.startswith('https://'):
                game.reddit_url = settings.REDDIT_URL.format(game.reddit_url)
                game.initial_reddit_url = game.reddit_url
            feed = get_feed('{}/.rss'.format(game.reddit_url.rstrip('/')))
            for entry in feed.entries:
                defaults = get_defaults(entry)
                if not defaults:
                    continue
                instance, created = Reddit.objects.get_or_create(external_id=entry['id'], game=game, defaults=defaults)
                if not created:
                    for key, value in defaults.items():
                        setattr(instance, key, value)
                        instance.save()
            game.reddit_name = feed['feed'].get('title') or ''
            game.reddit_description = feed['feed'].get('subtitle') or ''
            game.reddit_logo = feed['feed'].get('logo') or ''
            game.reddit_count = Reddit.objects.filter(game_id=game.id).count()
            game.save(update_fields=fields)
            self.stdout.write(self.style.SUCCESS('Reddit: {} of {}'.format(i, total)))

    def clear(self):
        qs = Game.objects.filter(reddit_url='', reddit_count__gt=0)
        data = []
        for game in qs:
            game.reddit_count = 0
            data.append(game)
        if data:
            bulk_update(data, update_fields=['reddit_count'])
        self.stdout.write(self.style.SUCCESS('Fixed: {}'.format(len(data))))


def get_feed(url):
    return feedparser.parse(url)


def get_text(raw_text):
    try:
        dom = html.fragment_fromstring(raw_text)
    except etree.ParserError:
        dom = html.fragment_fromstring('<article>{}</article>'.format(raw_text))
    image = None
    for img in dom.cssselect('img'):
        image = img.attrib['src']
    text = []
    for p in dom.cssselect('p'):
        text.append(etree.tostring(p, method='html', with_tail=False).decode('utf-8'))
    return ''.join(text), image


def get_defaults(entry):
    if not entry.get('title'):
        return
    text, image = get_text(entry['summary'])
    return {
        'name': entry['title'][0:500],
        'text': text,
        'image': image,
        'raw_text': entry['summary'],
        'url': entry['link'],
        'username': entry.get('author') or '',
        'username_url': entry.get('href') or '',
        'created': entry['updated'],
    }
