import csv
from time import sleep

import requests
from django.core.management.base import BaseCommand
from requests.exceptions import SSLError
from tqdm import tqdm

from apps.games.models import GameStore
from apps.utils.api import int_or_number


class Command(BaseCommand):
    help = 'Fix store urls'
    count_file = 'store_urls_{}.count'
    csv_file = 'store_urls_{}.csv'

    def add_arguments(self, parser):
        parser.add_argument('-s', '--store', action='store', dest='store_id', type=int)
        parser.add_argument('-p', '--pause', action='store', dest='pause', type=int, default=0)

    def handle(self, *args, **options):
        store_id = options['store_id']
        self.count_file = self.count_file.format(store_id)
        self.csv_file = self.csv_file.format(store_id)

        try:
            with open(self.count_file, 'r') as f:
                proceed = int_or_number(f.readline(), 0)
        except FileNotFoundError:
            proceed = 0

        data = []
        qs = GameStore.objects.order_by('id').exclude(url='').only('id', 'store_id', 'url').filter(store_id=store_id)
        game_store_id = None
        for i, game_store in enumerate(tqdm(qs.iterator(), total=qs.count())):
            game_store_id = game_store.id
            if game_store_id <= proceed:
                continue
            try:
                response = requests.get(game_store.url.replace('http://', 'https://'), allow_redirects=False)
                if options['pause'] and response.status_code == 403:
                    raise Exception(f'{game_store.url} - 403')
                if response.status_code != 200:
                    data.append((game_store_id, game_store.store_id, game_store.url, response.status_code))
            except SSLError:
                data.append((game_store_id, game_store.store_id, game_store.url, 500))
            if i and not i % 500:
                self.save(data, game_store_id)
                data = []
            if options['pause']:
                sleep(options['pause'])
        self.save(data, game_store_id)

    def save(self, data, game_store_id):
        if data:
            with open(self.csv_file, 'a+') as f:
                csv.writer(f).writerows(data)
        if game_store_id:
            with open(self.count_file, 'w') as f:
                f.write(str(game_store_id))
