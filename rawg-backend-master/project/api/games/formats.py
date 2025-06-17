from django.conf import settings
from django.forms import model_to_dict
from django.utils.timezone import now


def percents(games, children, word, to_dict=True, filter_hidden=False, fields=None):
    results = {}
    total = 0
    for game in games:
        if type(children) is str:
            items = getattr(game, children).all()
        else:
            items = children.get(game.id) or []
        for item in items:
            if filter_hidden and item.hidden:
                continue
            if not results.get(item.id):
                results[item.id] = {'count': 1}
                if to_dict:
                    if to_dict is True:
                        results[item.id][word] = model_to_dict(item, fields=fields)
                        if 'slug' in fields:
                            results[item.id][word]['slug'] = item.slug
                    if to_dict in ('id', 'name'):
                        results[item.id][word] = item.id
                    if to_dict == 'name':
                        results[item.id]['name'] = item.name
                        if hasattr(item, f'name_{settings.MODELTRANSLATION_DEFAULT_LANGUAGE}'):
                            for lang, _ in settings.LANGUAGES:
                                results[item.id][f'name_{lang}'] = getattr(item, f'name_{lang}')
                        results[item.id]['slug'] = item.slug
                else:
                    results[item.id][word] = item
            else:
                results[item.id]['count'] += 1
            total += 1
    percent = total / 100
    for game in results.values():
        game['percent'] = round(game['count'] / percent, 2)
    return sorted(results.values(), key=lambda x: -x['count'])


def ratings():
    return [
        {
            'from': 10,
            'to': 100,
            'filter': '10,100',
        },
        {
            'from': 40,
            'to': 100,
            'filter': '40,100',
        },
        {
            'from': 80,
            'to': 100,
            'filter': '80,100',
        },
    ]


def years_four(items):
    results = []
    items = [year for year in items if year]
    max_year = now().year
    min_year = min(items) if items else now().year
    for i, year in enumerate(range(max_year, min_year - 1, -4)):
        year_from = year - 3
        year_to = year
        results.append({
            'from': year_from,
            'to': year_to,
            'filter': '{}-01-01,{}-12-31'.format(year_from, year_to),
        })
    return results


def years(items):
    results = []
    items = [year for year in items if year]
    if not items:
        return results
    max_year = now().year
    min_year = min(items) if items else now().year
    max_decade = int(max_year / 10) * 10 + 10
    min_decade = int(min_year / 10) * 10
    for i, year in enumerate(range(max_decade, min_decade, -10)):
        year_from = year - 10
        # https://3.basecamp.com/3964781/buckets/10157323/todos/1496894518
        year_to = now().year if not i else year - 1
        results.append({
            'from': year_from,
            'to': year_to,
            'filter': '{}-01-01,{}-12-31'.format(year_from, year_to),
            'decade': year_from,
            'years': []
        })
    index = len(results) - 1
    if index != -1:
        for year in items:
            if year > results[index]['to']:
                index -= 1
                if index < 0:
                    break
            results[index]['years'].append({'year': year})
    for result in results:
        result['years'] = result['years'][::-1]
    return results
