from functools import reduce
from operator import or_

from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import F, Func, Q, URLField, Value

RAWG_URL_STARTS = 'https://media.rawg.io'
AG_URL_STARTS = 'https://cdn.ag.ru'


class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        models = apps.get_models()
        for model in models:
            print(f'Search URLField started in model: {model}')
            replace_kwargs, q_filter = {}, []
            for field in model._meta.fields:
                if isinstance(field, URLField):
                    replace_kwargs[field.name] = Func(
                        F(field.name),
                        Value(RAWG_URL_STARTS),
                        Value(AG_URL_STARTS),
                        Value('i'),
                        function='REGEXP_REPLACE'
                    )
                    q_filter.append(Q(**{f'{field.name}__istartswith': RAWG_URL_STARTS}))
            with transaction.atomic():
                if q_filter:
                    print(f'Model {model} has URLField, conversion starts...')
                    model.objects.filter(reduce(or_, q_filter)).update(**replace_kwargs)
                    print('Conversion is over', end='\n________\n')
                else:
                    print(f'Model {model} has no URLField', end='\n________\n')
