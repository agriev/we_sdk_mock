import html
import typing

from django.core.management.base import BaseCommand
from django.db.models import QuerySet
from tqdm import tqdm

from apps.games.models import Developer, Publisher
from apps.utils.tasks import merge_items


class Command(BaseCommand):
    endings = {
        '(HK) CO.Limited',
        '(HK) TECHNOLOGY CO.LIMITED',
        '(HK)CO.,LIMITED',
        '(OPC) PRIVATE LIMITED',
        '(PRIVATE) LIMITED',
        '(PTE.) LTD.',
        '(Pty) Ltd',
        '- LLC',
        '.company',
        'AB',
        'AG',
        'B.V.',
        'BV',
        'BVBA',
        'CO.,LTD',
        'CORP.',
        'CORPORATION',
        'Co.Limited',
        'Co.Ltd.',
        'Corp.',
        'Corp. Corp.',
        'Corp.Ltd.',
        'D.O.O.',
        'D.O.O. Nis',
        'GmbH',
        'GmbH & Co. KG',
        'INC',
        'INC.',
        'Inc',
        'Inc.',
        'Incorporated',
        'Investment Co.Ltd.',
        'LIMITED',
        'LLC',
        'LTD',
        'Limited',
        'Ltd',
        'Ltd.',
        'Oy LTD',
        'PTE. LTD.',
        'PTY LTD',
        'Private Limited',
        'Pte Ltd',
        'Pte Ltd_',
        'Pte. Ltd.',
        'Pty Ltd',
        'Pvt. Ltd',
        'S.A.',
        'S.A. de C.V.',
        'S.L',
        'S.L.',
        'S.L.U.',
        'S.R.L.',
        'S.R.L.S.',
        'S.R.O.',
        'S.r.l',
        'S.r.l.',
        'S.r.l.s.',
        'SA',
        'SARL',
        'SDN. BHD.',
        'SL',
        'SLNEU',
        'SLU',
        'SP. Z O.O.',
        'SRL',
        'Sdn. Bhd.',
        'Sp. z o. o. Sp. k.',
        'Sp. z o.o.',
        'Sp. z o.o. Sp.k.',
        'Srl',
        'V.O.F.',
        'VoF',
        'a.s.',
        'ag',
        'd.o.o.',
        'e.U.',
        'llc',
        'llc.',
        'private limited',
        's.c.',
        's.r.l.',
        's.r.o.',
        'sp. z o.o. sp. kom.',
        'srl',
        'srls',
        'std',
        'z o. o.',
        '®',
        '™',
    }

    def handle(self, *args, **options):
        for model in [Developer, Publisher]:
            self.process(model)

    def process(self, model: typing.Type[typing.Union[Developer, Publisher]]) -> None:
        # [3DS], [PS2/Wii], [Wii, DS], [Media] etc.
        qs = self.qs(model.objects.all()).filter(name__endswith=']').exclude(name__startswith='[')
        for obj in tqdm(qs.only('id', 'name').iterator(), total=qs.count(), desc=f'{model.__name__} - First Step'):
            if ' [' not in obj.name:
                continue
            new_name = obj.name.split('[').pop(0).strip()
            if len(new_name) < 3:
                continue
            self.rename_or_merge(model, obj, new_name)

        # (art), (GBA, NDS), (3DS) etc.
        qs = self.qs(model.objects.all()).filter(name__endswith=')').exclude(name__startswith='(')
        for obj in tqdm(qs.only('id', 'name').iterator(), total=qs.count(), desc=f'{model.__name__} - Second Step'):
            if '(' not in obj.name or ' (' not in obj.name:
                continue
            new_name = obj.name.split('(').pop(0).strip()
            if len(new_name) < 3:
                continue
            self.rename_or_merge(model, obj, new_name)

        # &#239;ds
        qs = self.qs(model.objects.all()).filter(name__contains='&#')
        for obj in tqdm(qs.only('id', 'name').iterator(), total=qs.count(), desc=f'{model.__name__} - Third Step'):
            new_name = html.unescape(obj.name)
            self.rename_or_merge(model, obj, new_name)

        # Wizards of the Coast LLC / Stainless Games
        qs = self.qs(model.objects.all()).filter(name__contains=' / ')
        for obj in tqdm(qs.only('id', 'name').iterator(), total=qs.count(), desc=f'{model.__name__} - Fourth Step'):
            new_names = obj.name.split(' / ')
            for new_name in new_names:
                self.create_new(model, new_name, obj)
            obj.delete()

        # Symbols
        for end in tqdm(self.endings, desc=f'{model.__name__} - Fifth Step'):
            qs = self.qs(model.objects.all()).filter(name__endswith=' {}'.format(end))
            for obj in tqdm(qs.only('id', 'name').iterator(), total=qs.count(), desc=end):
                new_name = obj.name[:-len(end)].strip(' ,.:-')
                self.rename_or_merge(model, obj, new_name)

    @staticmethod
    def rename_or_merge(
        model: typing.Type[typing.Union[Developer, Publisher]],
        obj: typing.Union[Developer, Publisher],
        new_name: str,
    ) -> None:
        existed = model.objects.only('id').filter(name=new_name).first()
        if existed:
            merge_items(existed.id, [obj.id], model._meta.app_label, model._meta.model_name, disable_reversion=True)
            return
        existed = model.find_by_synonyms(new_name).first()
        if existed:
            merge_items(existed.id, [obj.id], model._meta.app_label, model._meta.model_name, disable_reversion=True)
            return
        obj.name = new_name
        obj.save(update_fields=['name'])

    @classmethod
    def create_new(
        cls,
        model: typing.Type[typing.Union[Developer, Publisher]],
        new_name: str,
        obj: typing.Union[Developer, Publisher],
    ) -> None:
        existed = model.objects.only('id').filter(name=new_name).first()
        if existed:
            cls.add_games(existed, obj)
            return
        existed = model.find_by_synonyms(new_name).first()
        if existed:
            cls.add_games(existed, obj)
            return
        obj = model()
        obj.name = new_name
        obj.save()
        cls.add_games(existed, obj)

    @staticmethod
    def qs(qs: QuerySet) -> QuerySet:
        return qs

    @classmethod
    def add_games(
        cls,
        new_obj: typing.Union[Developer, Publisher],
        old_obj: typing.Union[Developer, Publisher],
    ) -> None:
        for game_id in old_obj.game_set.values_list('id', flat=True):
            new_obj.game_set.add(game_id)
