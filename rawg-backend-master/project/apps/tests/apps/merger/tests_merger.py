import os
from datetime import timedelta
from shutil import copyfile

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.test import TestCase, TransactionTestCase
from django.utils.timezone import now

from apps.achievements.models import Achievement, ParentAchievement, UserAchievement
from apps.feed.models import Feed
from apps.games.models import (
    Collection, CollectionGame, CollectionOffer, ESRBRating, Game, GameStore, Platform, ScreenShot, Store, Tag,
)
from apps.merger.merger import create_store, find_game, generate_tags, merge, update
from apps.merger.models import MergedSlug, Network, SimilarGame
from apps.reviews.models import Review
from apps.users.models import UserGame


class MergerBaseTestCase(object):
    def setUp(self):
        image = os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'image_1.jpg')
        self.target1 = '/tmp/image_1.jpg'
        self.target2 = '/tmp/image_2.jpg'
        copyfile(image, self.target1)
        copyfile(image, self.target2)
        video = os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'video_1.mp4')
        self.video = '/tmp/video.jpg'
        copyfile(video, self.video)
        super().setUp()


class MergerTestCase(MergerBaseTestCase, TestCase):
    def test_create_store(self):
        store, excluded = create_store('steam', ['pc', 'mac', 'linux'])

        self.assertEqual(store.slug, 'steam')
        self.assertEqual(Platform.objects.count(), 3)

    def test_find_game(self):
        SimilarGame.objects.all().delete()
        game, created, add_similar = find_game({'name': 'My game'}, [(1, 'Another'), (1, 'More')])

        self.assertEqual(game.name, 'My game')
        self.assertTrue(created)
        self.assertEqual(add_similar, [])

    def test_find_game_years(self):
        released = now()
        base_game = Game.objects.create(name='My game', synonyms=['my game'], released=released)

        game, created, _ = find_game({'name': 'My game', 'release_date': released.isoformat()}, [])
        self.assertEqual(game.id, base_game.id)
        self.assertFalse(created)

        base_game = Game.objects.create(name='My game 2', synonyms=['my game 2'],
                                        released=released.replace(year=released.year - 1))
        game, created, _ = find_game({'name': 'My game 2', 'release_date': released.isoformat()}, [])
        self.assertEqual(game.id, base_game.id)
        self.assertFalse(created)

        base_game = Game.objects.create(name='My game 3', released=released.replace(year=released.year - 2))
        game, created, _ = find_game({'name': 'My game 3', 'release_date': released.isoformat()}, [])
        self.assertEqual(game.id, base_game.id)
        self.assertNotEqual(game.name, 'My game 3 ({})'.format(released.year))
        self.assertFalse(created)

    def test_find_game_years_empty(self):
        base_game = Game.objects.create(name='My game', synonyms=['my game'])
        game, created, _ = find_game({'name': 'My game'}, [])
        self.assertEqual(game.id, base_game.id)
        self.assertFalse(created)

        base_game = Game.objects.create(name='My game 2', synonyms=['my game 2'], released=now())
        game, created, _ = find_game({'name': 'My game 2'}, [])
        self.assertEqual(game.id, base_game.id)
        self.assertFalse(created)

        base_game = Game.objects.create(name='My game 3', synonyms=['my game 3'])
        game, created, _ = find_game({'name': 'My game 3', 'release_date': now().isoformat()}, [])
        self.assertEqual(game.id, base_game.id)
        self.assertFalse(created)

    def test_find_game_normal_and_indie(self):
        store, _ = create_store('itch', ['pc', 'mac', 'linux', 'android', 'ios', 'web'])
        base_game = Game.objects.create(name='My game', synonyms=['my game'])
        game, created, _ = find_game({'name': 'My game', 'id': 123}, [], 'itch', False, store)
        self.assertNotEqual(game.id, base_game.id)
        self.assertTrue(created)
        self.assertTrue(game.name.endswith('(itch)'))

    def test_find_game_indie_and_normal(self):
        base_store, _ = create_store('itch', ['pc', 'mac', 'linux', 'android', 'ios', 'web'])
        store, _ = create_store('steam', ['pc', 'mac', 'linux'])
        base_game = Game.objects.create(name='My game', synonyms=['my game'], import_collection='itch')
        GameStore.objects.create(game=base_game, store=base_store, store_internal_id='123')

        game, created, _ = find_game({'name': 'My game'}, [], '', True, store)

        self.assertNotEqual(game.id, base_game.id)
        self.assertTrue(created)
        self.assertFalse(game.name.endswith('(new)'))
        self.assertTrue(Game.objects.get(id=base_game.id).name.endswith('(itch)'))

    def test_find_game_indie_and_indie(self):
        base_store, _ = create_store('itch', ['pc', 'mac', 'linux', 'android', 'ios', 'web'])
        base_game = Game.objects.create(name='My game', synonyms=['my game'], import_collection='itch')
        GameStore.objects.create(game=base_game, store=base_store, store_internal_id='123')
        game, created, _ = find_game(
            {'name': 'My game', 'id': 234, 'developers': ['Joseph', 'Peter']},
            [], 'itch', False, base_store
        )
        self.assertNotEqual(game.id, base_game.id)
        self.assertTrue(created)
        self.assertTrue(game.name.endswith('(Joseph, Peter)'))

    def test_find_game_by_store(self):
        store, _ = create_store('razer', ['pc', 'mac', 'linux'])
        steam, _ = create_store('steam', ['pc', 'mac', 'linux'])
        base_game = Game.objects.create(name='My game', synonyms=['my game'])
        GameStore.objects.create(game=base_game, store=steam, store_internal_id='123')
        game, created, _ = find_game({'name': 'Another Name', 'id': 5678, 'steam_id': 123}, [], 'razer', False, store)
        self.assertEqual(game.id, base_game.id)
        self.assertFalse(created)
        self.assertIn('another name', game.synonyms)

    def test_generate_tags(self):
        Tag.objects.create(name='city', games_count=51)
        Tag.objects.create(name='game', games_count=51)
        Tag.objects.create(name='top', games_count=51)
        Tag.objects.create(name='support', games_count=51)
        Tag.objects.create(name='open', games_count=51)
        Tag.objects.create(name='criminal', games_count=51)
        Tag.objects.create(name='theft', games_count=51)
        Tag.objects.create(name='auto', games_count=51)
        description = '''
        Welcome back to Vice City. Welcome back to the 1980s.
        From the decade of big hair, excess and pastel suits comes a story of one man's rise to the top of the
        criminal pile. Vice City, a huge urban sprawl ranging from the beach to the swamps and the glitz to the ghetto,
        was one of the most varied, complete and alive digital cities ever created. Combining open-world gameplay with
        a character driven narrative, you arrive in a town brimming with delights and degradation and given the
        opportunity to take it over as you choose.
        To celebrate its 10 year anniversary, Rockstar Games brings Grand Theft Auto: Vice City to mobile devices with
        high-resolution graphics, updated controls and a host of new features including:
        • Beautifully updated graphics, character models and lighting effects
        • New, precisely tailored firing and targeting options
        • Custom controls with a fully customizable layout
        • iCloud save game support
        • Massive campaign with countless hours of gameplay
        • Support for Retina display devices
        • Custom iTunes Playlist*
        *To listen to your custom playlist, simply create a playlist titled “VICECITY”, launch the game,
        and select the radio station “Tape Deck”
        Universal App:
        Grand Theft Auto: Vice City is supported on iPhone 4, iPhone 4S, iPhone 5, all iPad models and 4th and 5th
        generation iPod Touch.
        For optimal performance, we recommend re-booting your device after downloading and closing other applications
        when playing Grand Theft Auto: Vice City.
        Languages Supported: English, French, Italian, German, Spanish, Korean, Russian, and Japanese.
        Mobile Version developed by War Drum Studios
        www.wardrumstudios.com
        Find out more:
        www.rockstargames.com
        See videos:
        www.youtube.com/rockstargames
        Follow us:
        www.faceboook.com/rockstargames
        www.twitter.com/rockstargames
        '''
        tags = generate_tags(description)
        self.assertEqual(len(tags), 3)
        self.assertIn('city', tags)
        self.assertIn('auto', tags)
        self.assertIn('theft', tags)
        self.assertNotIn('support', tags)


class MergerTransactionTestCase(MergerBaseTestCase, TransactionTestCase):
    def test_update(self):
        game = Game.objects.create(name='My game', synonyms=['my game'])
        platform = Platform.objects.create(name='Mac')
        ESRBRating.objects.create(name='Everyone 10+', short_name='E10+')
        store = Store.objects.create(name='Steam')
        store.platforms.add(platform)

        with transaction.atomic():
            update(game, True, {
                'description': 'Game description',
                'required_age': '+7',
                'platforms': {'mac': {}},
                'screenshots': ['file://{}'.format(self.target1), 'file://{}'.format(self.target2)],
                'movies': [{
                    'id': '1',
                    'name': 'movie',
                    'preview': 'file://{}'.format(self.target1),
                    'data': {'max': 'file://{}'.format(self.video)}
                }],
                'developers': ['Developer 1', 'Developer 2'],
                'publishers': ['Publisher 1', 'Publisher 2'],
                'genres': ['Genre 1', 'Genre 2'],
                'tags': ['Tag 1', 'Tag 1'],
                'release_date': now().isoformat(),
            }, store)

        new_game = Game.objects.get(id=game.id)
        self.assertEqual(new_game.esrb_rating, ESRBRating.objects.first())
        self.assertEqual(new_game.screenshots.count(), 2)
        self.assertEqual(new_game.genres.count(), 2)
        self.assertEqual(new_game.tags.count(), 1)

    def test_save_merged_slugs(self):
        slug_one = 'some_slug_without_digits'
        slug_two = 'some_slug_with_some_digits_1234'
        new_slug, _ = MergedSlug.save_merged_slugs(slug_one, slug_two, Game)
        saved_slug = MergedSlug.objects.get(
            new_slug=new_slug,
            content_type=ContentType.objects.get_for_model(Game)
        )
        self.assertEqual(new_slug, slug_one)
        self.assertTrue(saved_slug)

    def test_rewrite_merged_slugs(self):
        old_slug_one = 'some_slug_one'
        new_slug_one = old_slug_two = 'some_slug_two'
        new_slug_two = 'some_slug_three'
        MergedSlug.objects.create(
            old_slug=old_slug_one, new_slug=new_slug_one,
            content_type=ContentType.objects.get_for_model(Game)
        )

        MergedSlug.rewrite_merged_slugs(new_slug_two, old_slug_two, Game)
        rewrited_slugs = MergedSlug.objects.get(
            old_slug=old_slug_one,
            content_type=ContentType.objects.get_for_model(Game)
        )

        self.assertEqual(rewrited_slugs.new_slug, new_slug_two)

    def test_merge(self):
        tag_1 = Tag.objects.create(name='Tag 1')
        tag_2 = Tag.objects.create(name='Tag 2')
        game = Game.objects.create(name='My game 1', synonyms=['my game 1'])
        game.tags.add(tag_1)
        game_from = Game.objects.create(name='My game 2')
        game_from.tags.add(tag_2)

        platform = Platform.objects.create(name='PC')
        store = Store.objects.create(name='Steam')
        store.platforms.add(platform)
        gamestore = GameStore.objects.create(game=game_from, store=store)

        user = get_user_model().objects.create(username='test', email='test@test.io')
        user_other = get_user_model().objects.create(username='test_other', email='test_other@test.io')
        user_third = get_user_model().objects.create(username='test_third', email='test_third@test.io')
        UserGame.objects.create(game=game_from, user=user)

        collection = Collection.objects.create(name='Collection', creator=user)
        CollectionGame.objects.create(game=game_from, collection=collection)
        CollectionOffer.objects.create(game=game_from, collection=collection, creator=user)

        Review.objects.create(game=game, user=user, rating=Review.RATING_EXCEPTIONAL)
        Review.objects.create(game=game, user=user_other, rating=Review.RATING_MEH)
        Review.objects.create(
            game=game,
            rating=Review.RATING_MEH,
            external_store=gamestore,
            external_source='https://steamcommunity.com/some/url',
        )
        review_from_remove = Review.objects.create(game=game_from, user=user, rating=Review.RATING_EXCEPTIONAL)
        review_from_move = Review.objects.create(game=game_from, user=user_third, rating=Review.RATING_MEH,
                                                 text='My meh review')
        review_feed = Feed.objects.filter(action=Feed.ACTIONS_ADD_REVIEW).first()
        review_feed.skip_auto_now = True
        review_feed.created -= timedelta(minutes=1)
        review_feed.save()

        screen_1 = ScreenShot.objects.create(game=game, source='https://google.com/image_1.jpg')
        screen_1.image = self.target1
        screen_1.save()
        screen_2 = ScreenShot.objects.create(game=game_from, source='https://google.com/image_2.jpg')
        screen_2.image = self.target2
        screen_2.save()

        network = Network.objects.create(name='Steam')
        parent_0 = ParentAchievement.objects.create(name='Red Bullet', game=game)
        parent_1 = ParentAchievement.objects.create(name='Blue Bullet', game=game)
        parent_2 = ParentAchievement.objects.create(name='Green Bullet', game=game)
        achievement_0 = Achievement.objects.create(name='Red Bullet', parent=parent_0, network=network, uid='0')
        achievement_1 = Achievement.objects.create(name='Blue Bullet', parent=parent_1, network=network, uid='1')
        achievement_2 = Achievement.objects.create(name='Green Bullet', parent=parent_2, network=network, uid='2')
        UserAchievement.objects.create(achievement=achievement_0, user=user)
        UserAchievement.objects.create(achievement=achievement_1, user=user_other)
        UserAchievement.objects.create(achievement=achievement_2, user=user_third)
        parent_0 = ParentAchievement.objects.create(name='Red Bullet', game=game_from)
        parent_1 = ParentAchievement.objects.create(name='Blue Bullet', game=game_from)
        parent_3 = ParentAchievement.objects.create(name='Orange Bullet', game=game_from)
        achievement_00 = Achievement.objects.create(name='Red Bullet', parent=parent_0, network=network, uid='00')
        achievement_11 = Achievement.objects.create(name='Blue Bullet', parent=parent_1, network=network, uid='11')
        achievement_33 = Achievement.objects.create(name='Orange Bullet', parent=parent_3, network=network, uid='33')
        UserAchievement.objects.create(achievement=achievement_00, user=user)
        UserAchievement.objects.create(achievement=achievement_11, user=user_other)
        UserAchievement.objects.create(achievement=achievement_33, user=user_third)

        with transaction.atomic():
            merge(game, game_from)

        new_game = Game.objects.get(id=game.id)

        self.assertIn(game.name.lower(), new_game.synonyms)
        self.assertIn(game_from.name.lower(), new_game.synonyms)

        self.assertIn(tag_1.id, new_game.tags.values_list('id', flat=True))
        self.assertIn(tag_2.id, new_game.tags.values_list('id', flat=True))

        self.assertEqual(new_game.screenshots.count(), 2)

        self.assertEqual(CollectionOffer.objects.filter(collection=collection).first().game, game)

        with self.assertRaises(Game.DoesNotExist):
            Game.objects.get(id=game_from.id)

        with self.assertRaises(Review.DoesNotExist):
            Review.objects.get(id=review_from_remove.id)
        self.assertEqual(Review.objects.get(id=review_from_move.id).game_id, new_game.id)
        self.assertEqual(Review.objects.get(id=review_from_move.id).game_id, new_game.id)

        self.assertEqual(Feed.objects.filter(action=Feed.ACTIONS_ADD_REVIEW).first().created, review_feed.created)

        self.assertEqual(new_game.ratings[str(Review.RATING_EXCEPTIONAL)], 1)
        self.assertEqual(new_game.ratings[str(Review.RATING_MEH)], 2)

        self.assertEqual(UserAchievement.objects.count(), 6)
        self.assertEqual(Achievement.objects.count(), 6)
        self.assertEqual(ParentAchievement.objects.count(), 4)

        new_review = Review.objects.get(game_id=game.id, user=None)

        self.assertTrue(new_review.external_source)

    def test_merge_dates(self):
        released = now().date()
        game = Game.objects.create(name='My game 1', released=released)
        game_from = Game.objects.create(name='My game 2')

        with transaction.atomic():
            merge(game, game_from)

        self.assertEqual(game.released, released)
        self.assertEqual(Game.objects.get(id=game.id).released, released)
