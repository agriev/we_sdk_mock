from collections import namedtuple

from django.conf import settings

from api.games import serializers as games_serializers
from apps.games.cache import PlatformParentListByPlatform


def is_docs(kwargs):
    return kwargs.get('initial') and kwargs['initial'].get('api-docs')


def get_statistic_platforms(ids, items, params):
    platforms = PlatformParentListByPlatform().get()
    groups = {}
    for i, item in enumerate(items):
        if 'slug' in item:
            del item['name'], item['slug']
        parent = platforms.get(item[params.name])
        if not parent:
            continue
        key = 'parent.{}'.format(parent.id)
        if key in groups:
            groups[key]['count'] += item['count']
            groups[key]['percent'] += item['percent']
        else:
            item[params.name] = params.serializer(parent).data
            groups[key] = item
    for key in groups:
        groups[key]['percent'] = round(groups[key]['percent'], 2)
    return sorted(groups.values(), key=lambda x: -x['count'])


def get_statistic_data(data, statistics, targets, request, is_all=False):
    Param = namedtuple('Param', ('name', 'model', 'serializer', 'limit'))
    keys = {
        'platforms': Param('platform', 'get_statistic_platforms', games_serializers.PlatformParentSerializer, 0),
        'genres': Param('genre', None, None, 5),
        'developers': Param('developer', None, None, 5),
    }
    if is_all:
        local_targets = keys.keys()
    else:
        local_targets = [target for target in targets if target in keys.keys()]
    for target in local_targets:
        params = keys[target]
        statistics = (statistics or {})
        items = statistics.get('games_{}'.format(target)) or []
        total = statistics.get('games_{}_total'.format(target)) or len(items)
        if params.limit:
            items = items[0:params.limit]
        ids = []
        for item in items:
            ids.append(item[params.name])

        if type(params.model) is str:
            items = globals()[params.model](ids, items, params)
        else:
            for i, item in enumerate(items):
                item[params.name] = {
                    'id': item[params.name],
                    'name': (
                        item.get(f'name_{request.LANGUAGE_CODE}')
                        or item.get(f'name_{settings.MODELTRANSLATION_DEFAULT_LANGUAGE}')
                        or item.get('name')
                        or ''
                    ),
                    'slug': item.get('slug', ''),
                }
                item['percent'] = round(item['percent'], 2)
                if 'slug' in item:
                    del item['name'], item['slug']
                if f'name_{settings.MODELTRANSLATION_DEFAULT_LANGUAGE}' in item:
                    for lang, _ in settings.LANGUAGES:
                        del item[f'name_{lang}']

        data[target] = {'total': total}
        if params.limit and items:
            percent = items[0]['count'] / 100
            for item in items:
                item['percent'] = round(item['count'] / percent, 2)
        data[target]['results'] = items
        data[target]['count'] = len(items)


def response_rating(response, request, paginator, chart_name, chart_id=None):
    if request.API_CLIENT_IS_WEBSITE:
        page_number = request.query_params.get(paginator.page_query_param, 1)
        page_size = paginator.get_page_size(request)
        for new_position, item in enumerate(response.data['results']):
            old_position = (item.pop('charts') or {}).get(chart_name)
            if chart_id and old_position:
                old_position = old_position.get(str(chart_id))
            if type(old_position) is list:
                old_position = old_position[0]
            position = int(new_position) + ((int(page_number) - 1) * page_size)
            if old_position is None:
                item['chart'] = 'new'
            elif position < old_position:
                item['chart'] = 'up'
            elif position == old_position:
                item['chart'] = 'equal'
            elif position > old_position:
                item['chart'] = 'down'
    return response
