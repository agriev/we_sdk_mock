from time import sleep

import requests
import reversion
from django.conf import settings
from django.core.management import BaseCommand
from django.db.models.functions import Length
from django.utils import translation
from tqdm import tqdm

from apps.games.models import Game
from apps.merger.merger import keep_tags


class Command(BaseCommand):
    api = 'https://store.steampowered.com/api/appdetails/?appids={}&l=en'
    language = settings.MODELTRANSLATION_DEFAULT_LANGUAGE

    def handle(self, *args, **options):
        qs = (
            Game.objects
            .annotate(len=Length('description_en'))
            .filter(len__lte=500, stores=1)
            .exclude(description_is_protected=True)
        )
        for i, game in enumerate(tqdm(qs.only('id', 'stores_json'), total=qs.count())):
            self.game(game)
        self.stdout.write(self.style.SUCCESS('OK'))

    def game(self, game, retry=True):
        if not game.stores_json:
            return
        for store in game.stores_json:
            if store['store']['slug'] != 'steam' or not store['url']:
                return
            application_id = store['url'].split('/app/').pop().split('/').pop(0)
            url = self.api.format(application_id)
            try:
                data = requests.get(url).json()
            except Exception:
                if retry:
                    sleep(10)
                    return self.game(game, False)
                return
            if not (data[application_id] or {}).get('success'):
                return
            data = data[application_id]['data']
            description = data.get('detailed_description')
            if not description:
                return
            with reversion.create_revision(), translation.override(self.language):
                game.description_en = keep_tags(description)
                game.description = game.description_en
                game.save(update_fields=['description', 'description_en'])
                reversion.set_comment('Changed by the crawler merger.')
            sleep(1)
