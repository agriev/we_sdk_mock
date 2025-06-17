from django.test import TransactionTestCase
from django.utils.timezone import now, timedelta

from apps.credits.models import GamePerson, Person, Position
from apps.credits.seo import generate_auto_description_en
from apps.games.models import Game
from apps.utils.tasks import merge_items


class ModelsTestCase(TransactionTestCase):
    def test_person_merge(self):
        game = Game.objects.create(name='My game')
        person = Person.objects.create(name='Jimi', synonyms=['jimi'])
        person_new = Person.objects.create(name='Jim', synonyms=['jim'], wikibase_id='W123')
        deleted_id = person_new.id
        composer = Position.objects.create(name='Composer')
        programmer = Position.objects.create(name='Programmer')
        GamePerson.objects.create(game=game, person=person, position=composer)
        GamePerson.objects.create(game=game, person=person_new, position=composer)
        GamePerson.objects.create(game=game, person=person_new, position=programmer)

        merge_items(person.id, [person_new.id], Person._meta.app_label, Person._meta.model_name)

        self.assertEqual(Person.objects.filter(id=deleted_id).count(), 0)
        self.assertEqual(Person.objects.count(), 1)
        self.assertEqual(GamePerson.objects.count(), 2)
        self.assertEqual(Person.objects.get(id=person.id).wikibase_id, 'W123')

    def test_game_person_count(self):
        game = Game.objects.create(name='Villagers')
        programmer = Position.objects.create(name='Programmer')
        writer = Position.objects.create(name='Writer')
        designer = Position.objects.create(name='Designer')
        person1 = Person.objects.create(name='David Kitt')
        person2 = Person.objects.create(name='Suede')
        person3 = Person.objects.create(name='Kan Wakan')
        game_person1 = GamePerson.objects.create(game=game, position=writer, person=person1)
        game_person2 = GamePerson.objects.create(game=game, position=programmer, person=person1)
        game_person3 = GamePerson.objects.create(game=game, position=writer, person=person2)
        GamePerson.objects.create(game=game, position=designer, person=person3, hidden=True)

        self.assertEqual(Game.objects.get(id=game.id).persons_count, 2)

        new_game = Game.objects.create(name='Like Lighting')
        game_person3.game = new_game
        game_person3.save(update_fields=['game'])

        self.assertEqual(Game.objects.get(id=game.id).persons_count, 1)
        self.assertEqual(Game.objects.get(id=new_game.id).persons_count, 1)

        game_person1 = GamePerson.objects.get(id=game_person1.id)
        game_person1.hidden = True
        game_person1.save(update_fields=['hidden'])

        self.assertEqual(Game.objects.get(id=game.id).persons_count, 1)

        game_person2 = GamePerson.objects.get(id=game_person2.id)
        game_person2.hidden = True
        game_person2.save(update_fields=['hidden'])

        self.assertEqual(Game.objects.get(id=game.id).persons_count, 0)

        game_person2 = GamePerson.objects.get(id=game_person2.id)
        game_person2.hidden = False
        game_person2.save(update_fields=['hidden'])

        self.assertEqual(Game.objects.get(id=game.id).persons_count, 1)

        GamePerson.objects.get(id=game_person2.id).delete()

        self.assertEqual(Game.objects.get(id=game.id).persons_count, 0)

    def test_auto_description(self):
        game_future = Game.objects.create(name='Super Villagers', released=(now() + timedelta(days=50)))
        programmer = Position.objects.create(name='Programmer')
        designer = Position.objects.create(name='Designer')
        person = Person.objects.create(name='David Kitt')
        GamePerson.objects.create(game=game_future, position=designer, person=person)

        description = generate_auto_description_en(person)
        self.assertGreater(len(description), 0)

        past_game = Game.objects.create(name='Like Lighting', released=(now() - timedelta(days=50)))
        GamePerson.objects.create(game=past_game, person=person, position=programmer)

        description = generate_auto_description_en(person)
        self.assertGreater(len(description), 0)
