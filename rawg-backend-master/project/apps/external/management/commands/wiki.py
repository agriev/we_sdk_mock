import mwparserfromhell
import pycurl
import wptools
from django.core.management.base import BaseCommand

from apps.credits.models import GamePerson, Person, Position
from apps.external.models import WikiData
from apps.games.models import Game
from apps.utils import dicts
from apps.utils.exceptions import capture_exception
from apps.utils.images import ImageException, content_to_jpeg_file, get_image
from apps.utils.wiki import WikiParser

wptools.utils.stderr = lambda msg, silent=False: None


class NotFound(Exception):
    pass


class Command(WikiParser, BaseCommand):
    data = {
        'author': (['writer', 'author'], 'writer'),
        'composer': ('composer', 'composer'),
        'designed by': ('designer', 'designer'),
        'director': ('director', 'director'),
        'game artist': ('artist', 'artist'),
        'producer': ('producer', 'producer'),
        'programmer': ('programmer', 'programmer'),
    }
    debug = False
    persons = set()

    def add_arguments(self, parser):
        parser.add_argument('-g', '--game_id', action='store', dest='game_id', default=0, type=int)
        parser.add_argument('-c', '--count', action='store', dest='count', default=100, type=int)
        parser.add_argument('-s', '--start', action='store', dest='start', default=0, type=int)
        parser.add_argument('-p', '--parse', action='store_true', dest='only_parse', default=False)
        parser.add_argument('-w', '--without_persons', action='store_true', dest='without_persons', default=False)
        parser.add_argument('-d', '--debug', action='store_true', dest='debug', default=False)

    def handle(self, *args, **options):
        self.options = options
        self.debug = self.options['debug']
        try:
            self.run()
        except Exception as e:
            capture_exception(e)
            self.stdout.write(self.style.ERROR(str(e)))
        self.stdout.write(self.style.SUCCESS('OK'))

    def run(self):
        qs = Game.objects
        if self.options['game_id']:
            qs = qs.filter(id=self.options['game_id'])
        else:
            qs = qs.order_by('-added')[self.options['start']:self.options['count']]
        total = qs.count()
        if not self.options['only_parse']:
            self.fetch(qs, total)
        self.parse(qs, total)

    def fetch(self, qs, total):
        fields_save = ('wikibase_id', 'wikipedia_name', 'wikipedia_not_found', 'is_complicated_name')
        for i, game in enumerate(qs.prefetch_related('wikidata_set').only('id', 'name', 'released', *fields_save)):
            game.wikipedia_disable = True
            try:
                data = WikiData.objects.get(game_id=game.id)
            except WikiData.DoesNotExist:
                data = WikiData()
                data.game = game
            except WikiData.MultipleObjectsReturned:
                WikiData.objects.filter(game_id=game.id).delete()
                data = WikiData()
                data.game = game
            try:
                game.wikipedia_name, game.wikibase_id, data.infobox, data.wikidata, game.is_complicated_name = \
                    self.get_page(game)
                game.save(update_fields=fields_save)
                data.save()
                self.stdout.write(self.style.SUCCESS('Wiki fetching: {} of {} - {} - #{}'
                                                     .format(i, total, game.wikipedia_name, game.id)))
            except NotFound:
                game.wikipedia_not_found = True
                game.save(update_fields=['wikipedia_not_found'])
                self.stdout.write(self.style.ERROR('Not found: {}'.format(game.name)))

    def get_page(self, game, name=None, check_what=True, is_complicated_name=False):
        search_name = name if name else (game.wikipedia_name if game.wikipedia_name else game.name)
        page = wptools.page(search_name, silent=True, verbose=False)
        try:
            page.get_parse()
        except (LookupError, pycurl.error, ValueError):
            raise NotFound

        name = page.data['title']
        try:
            wikibase = page.data['wikibase']
        except KeyError:
            wikibase = None

        if 'disambiguation' in name.lower():
            return self.get_page(game, self.search(page, game), check_what, True)

        try:
            page.get_wikidata()
        except (LookupError, pycurl.error):
            pass

        what = (page.data.get('what') or '').lower()
        if check_what and not what:
            return self.fix_name(game, search_name, page.data.get('what'))

        if 'disambiguation' in what:
            return self.get_page(game, self.search(page, game), check_what, True)

        if check_what and what != 'video game':
            return self.fix_name(game, search_name, page.data.get('what'))

        return name, wikibase, page.data['infobox'], page.data['wikidata'], is_complicated_name

    def fix_name(self, game, search_name, what):
        is_complicated_name = True
        if what and ('expansion pack' in what or 'video game' in what):
            is_complicated_name = False
        new_name = '{} ({} video game)'.format(search_name, game.released.year)
        self.stdout.write(self.style.WARNING('Strange what: {}. Change name to: {}'.format(what, new_name)))
        try:
            try:
                return self.get_page(game, new_name, False, is_complicated_name)
            except NotFound:
                new_name = '{} (video game)'.format(search_name)
                self.stdout.write(self.style.WARNING('Not found. Change name to: {}'.format(new_name)))
                return self.get_page(game, new_name, False, is_complicated_name)
        except NotFound:
            self.stdout.write(self.style.WARNING('Not found. Change name back to: {}'.format(search_name)))
            return self.get_page(game, search_name, False, is_complicated_name)

    def search(self, page, game):
        page.get_query()
        self.stdout.write(self.style.WARNING('Search: {}'.format(game.name)))
        for link in page.data['links']:
            if '{} video game'.format(game.released.year) in link.lower():
                return link
        for link in page.data['links']:
            if 'video game' in link.lower():
                return link
        for link in page.data['links']:
            if 'game' in link.lower():
                return link
        raise NotFound

    def parse(self, qs, total):
        for i, game in enumerate(qs.prefetch_related('wikidata_set').only('id')):
            if not game.wikidata_set.count():
                continue
            data = game.wikidata_set.first()

            fix_wikidata = self.fix_wikidata(data.wikidata, 'persons')
            wikidata = {}
            for wd, (_, slug) in self.data.items():
                if wd in fix_wikidata:
                    wikidata[slug] = fix_wikidata[wd]

            fix_infobox = self.fix_infobox(data.infobox)
            infobox = {}
            for wd, (ib, slug) in self.data.items():
                if not type(ib) is list:
                    ib = [ib]
                infobox[slug] = {'persons': {}}
                for el in ib:
                    if el in fix_infobox:
                        before = fix_infobox[el].strip()
                        after = self.clear_html(before)
                        templates = mwparserfromhell.parse(after).filter_templates()
                        if not after:
                            continue
                        if templates:
                            infobox[slug]['persons'] = self.get_links_from_template(templates)
                        else:
                            infobox[slug]['persons'] = self.get_links_from_text(after)

            output = dicts.merge(infobox, wikidata)
            self.write(output, game)

            self.stdout.write(self.style.SUCCESS('Wiki parsing: {} of {} - {} - #{}'
                                                 .format(i, total, game.wikipedia_name, game.id)))

    def write(self, output, game):
        for position_slug, values in output.items():
            defaults = {'name': position_slug, 'wikibase_id': values.get('wikibase_id')}
            position, created = Position.objects.get_or_create(slug=position_slug, defaults=defaults)
            if not created:
                if defaults['wikibase_id'] and position.wikibase_id != defaults['wikibase_id']:
                    position.wikibase_id = defaults['wikibase_id']
                    position.save()
                    self.stdout.write(self.style.WARNING('Wiki update position: {}'.format(position.name)))
            else:
                self.stdout.write(self.style.SUCCESS('Wiki new position: {}'.format(position.name)))
            for _, defaults in values['persons'].items():
                if not defaults['name']:
                    continue
                created = False
                synonyms = Person.find_by_synonyms(defaults['name'])
                if synonyms:
                    person = synonyms.first()
                else:
                    defaults['synonyms'] = [defaults['name'].lower()]
                    person, created = Person.objects.get_or_create(name=defaults['name'], defaults=defaults)
                if not created:
                    changed = False
                    if defaults.get('wikibase_id') and person.wikibase_id != defaults['wikibase_id']:
                        person.wikibase_id = defaults['wikibase_id']
                        changed = True
                    if defaults.get('link') and person.link < defaults['link']:
                        person.link = defaults['link']
                        changed = True
                    if changed:
                        person.save()
                        self.stdout.write(self.style.WARNING('Wiki update person: {}'.format(person.name)))
                else:
                    self.stdout.write(self.style.SUCCESS('Wiki create person: {}'.format(person.name)))
                if not self.options['without_persons']:
                    self.person(person)
                _, created = GamePerson.objects.get_or_create(game_id=game.id, person=person, position=position)
                if created:
                    self.stdout.write(self.style.SUCCESS('Wiki create game person: {} - {} - {}'
                                                         .format(game.wikipedia_name, person.name, position.name)))

    def person(self, person):
        if not person.link:
            return
        page = wptools.page(person.link, silent=True, verbose=False)
        try:
            page.get_query()
        except LookupError:
            return
        image = None
        images = page.data.get('image') or []
        if images:
            image = images[0]['url']
        person.description_wiki = page.data.get('extract') or ''
        self.load_image(image, person)
        person.save(update_fields=['image_wiki', 'description_wiki'])
        self.stdout.write(self.style.SUCCESS('Wiki fetch data for person: {}'.format(person.name)))

    def load_image(self, url, person):
        if not url or person.id in self.persons:
            return
        try:
            person.image_wiki.save(*content_to_jpeg_file(*get_image(url)))
        except ImageException:
            pass
        self.persons.add(person.id)

    def warn(self, text):
        if self.debug:
            self.stdout.write(self.style.WARNING(text))

    def err(self, text):
        if self.debug:
            self.stdout.write(self.style.ERROR(text))

    def pr(self, text):
        if self.debug:
            self.stdout.write(text)
