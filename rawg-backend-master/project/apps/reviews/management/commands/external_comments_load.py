import json
import os
import time
from datetime import datetime, timezone
from urllib.request import urlopen

import pymongo
import requests
import reversion
from django.conf import settings
from django.core.files import File
from django.core.files.temp import NamedTemporaryFile
from django.core.management.base import BaseCommand
from django.utils import translation

from apps.games import models
from apps.reviews.models import Review
from apps.utils.dates import get_localized_date
from apps.utils.exceptions import capture_exception
from apps.utils.strings import safe_text

RATING_MAPS = {
    'apple-appstore': {
        1: 1, 2: 1, 3: 4, 4: 4, 5: 5, },
    'steam': {
        1: 1, 5: 5, },
}


class Command(BaseCommand):
    help = 'Load reviews from mongo and translate'
    crawlers = {
        'ios_comments': 'apple-appstore',
        'steam_comments': 'steam',
    }
    process_num = 0
    processes = 0
    limit = 0

    def add_arguments(self, parser):
        parser.add_argument('crawlers', type=str)
        parser.add_argument('-c', '--limit', action='store', dest='limit', default=0, type=int)
        parser.add_argument('-p', '--proxy', action='store', dest='proxy', default=0, type=int)
        parser.add_argument('-g', '--game_id', action='store', dest='game_id', default=0, type=int)

    def handle(self, *args, **options):
        azure_key1 = os.environ.get('MS_AZURE_KEY_1')

        if not azure_key1:
            print('no Azure key found')
            return

        try:
            if options['crawlers'] == 'all':
                crawlers = self.crawlers.keys()
            else:
                self.limit = options['limit']
                crawlers = [c for c in options['crawlers'].split(',') if c in self.crawlers.keys()]
                if options.get('game_id'):
                    self.process(crawlers, options.get('game_id'))
                else:
                    self.process(crawlers)
        except Exception as e:
            capture_exception(e, raise_on_debug=True, raise_on_tests=False)

    def process(self, crawlers, game_id=None):
        self.client = pymongo.MongoClient(settings.MONGO_HOST, settings.MONGO_PORT)
        index = 0
        errors = 0
        count = sum([self.client.games[collection].count('reviews') for collection in crawlers])
        for collection in crawlers:
            items = self.client.games[collection]
            pipeline = [{'$match': {'is_new': 1}}]
            if self.limit:
                pipeline.append({'$limit': self.limit})
            if game_id:
                pipeline.append({'$match': {'id': str(game_id)}})
            data = items.aggregate(pipeline, allowDiskUse=True)
            col_name = self.crawlers[collection]
            for item in data:
                proc = process_review((item, col_name))
                if proc:
                    self.client.games[collection].update_one(
                        filter={'id': item['id']},
                        update={'$set': {'is_new': 0}},
                    )
                    index += 1
                    self.stdout.write(self.style.SUCCESS('Processing {}/{} Reviews'.format(index, count)))
                else:
                    errors += 1
                    self.stdout.write(self.style.ERROR('Rejected {}/{} Reviews'.format(errors, count)))

        status_str = f'Total: Success {index}, Rejected {errors}, Skipped: {count - (index + errors)}'
        self.stdout.write(self.style.SUCCESS(status_str))

        self.stdout.write(self.style.SUCCESS('OK'))


def process_review(iter_args):
    game_data, store_slug = iter_args
    reviews = filter_reviews_by_length(game_data)

    if not reviews:
        return

    game_store = try_get_game_store_instance(
        game_data,
        store_slug
    )
    if not game_store:
        return

    game = game_store.game

    processed = False

    for review in reviews:
        try:
            game_reviews = game.reviews.filter(user=None).all()
            if len(game_reviews) >= 10:
                continue

            game_symbols = sum([len(item.text) for item in game_reviews])
            if game_symbols >= 2500:
                continue

            date_created = datetime.combine(
                get_localized_date(review['date']),
                datetime.min.time(),
                tzinfo=timezone.utc,
            )
            external_author = safe_text(review['user']).rstrip()
            obj = Review.objects.filter(
                game=game,
                external_lang=review['lang'],
                external_author=external_author,
            )
            if obj:
                continue
            rating = RATING_MAPS[store_slug][review['rating']]
            body = translate_api(review)
            if not body:
                continue
            obj = Review(
                text=body,
                rating=rating,
                created=date_created,
                is_text=True,
                game=game,
                external_source=review.get('source_url', ''),
                external_store=game_store,
                external_lang=review['lang'],
                external_author=external_author,
            )
            with reversion.create_revision(), translation.override(settings.MODELTRANSLATION_DEFAULT_LANGUAGE):
                obj.save()

            avatar = review['avatar']

            if avatar:
                try:
                    img_temp = NamedTemporaryFile(delete=True)
                    img_temp.write(urlopen(avatar).read())
                    img_temp.flush()
                    obj.external_avatar.save(avatar.split('?')[0].split('/').pop(), File(img_temp))
                except Exception as e:
                    capture_exception(e, raise_on_debug=True, raise_on_tests=False)

        except Exception as e:
            capture_exception(e, raise_on_debug=True, raise_on_tests=False)

        processed = True

    return processed


def filter_reviews_by_length(item):
    symbols_limit = 3000

    new_reviews = [review for review in item['reviews']]

    total_symbols = sum(
        set([len(r['body']) for r in new_reviews])
    )

    if total_symbols < symbols_limit:
        return
    reviews_sorted = sorted(new_reviews, key=lambda k: len(k['body']), reverse=True)
    return reviews_sorted


def try_get_game_store_instance(item, store_slug):
    return models.GameStore.objects.filter(
        store_internal_id=item.get('id'),
        store__slug=store_slug
    ).first()


def remove_emoji(text):
    return text.encode('ascii', 'ignore').decode('ascii')


def translate_api(review):
    azure_key1 = os.environ.get('MS_AZURE_KEY_1')
    if not azure_key1:
        print('no Azure key found')
        return

    try:
        response = requests.post(
            url="https://api.cognitive.microsofttranslator.com/translate",
            params={
                "api-version": "3.0",
                "to": "en",
            },
            headers={
                "Ocp-Apim-Subscription-Key": azure_key1,
                "Content-Type": "application/json; charset=utf-8",
            },
            data=json.dumps([
                {
                    "Text": review['body']
                }
            ])
        )
        if response.status_code == 200:
            response_json = response.json()[0]['translations'][0]['text']
            return response_json

        elif response.status_code == 429:
            time.sleep(10)

        return

    except Exception as e:
        capture_exception(e, raise_on_debug=True, raise_on_tests=False)
    return review
