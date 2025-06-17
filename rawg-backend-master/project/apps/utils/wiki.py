import mwparserfromhell
from bs4 import BeautifulSoup


class WikiParser:
    bad_nodes = ('ext', 'comment', 'small')
    bad_tags = ('efn', 'cite video game', 'small')
    bad_item_starts = ('<!--', '{{', 'name=')
    bad_item_elements = ('ref',)

    def fix_wikidata(self, data, items_name='items'):
        fix_wikidata = {}
        for key, values in data.items():
            if not type(values) is list:
                values = [values]
            new_values = {}
            for value in values:
                if type(value) is dict or value is None:
                    continue
                s = value.split('(Q')
                link = s[0].strip()
                name = link.split('(')[0].strip()
                new_values[name.lower()] = {
                    'wikibase_id': 'Q{}'.format(s[1].strip(' )')) if len(s) > 1 else '',
                    'link': link,
                    'name': name
                }
            position = key.split('(')[0].strip().lower()
            fix_wikidata[position] = {
                'wikibase_id': key.split('(')[1].strip(' )'),
                items_name: new_values,
            }
        return fix_wikidata

    def fix_infobox(self, data):
        fix_infobox = {}
        for key, value in (data or {}).items():
            fix_infobox[key.strip().lower()] = value
        return fix_infobox

    def clear_html(self, text):
        soup = BeautifulSoup(text, 'html.parser')
        for node in soup.findAll():
            if node.name in self.bad_nodes:
                node.replace_with('')
        return str(soup)

    def get_links_from_text(self, text):
        results = {}
        for node in BeautifulSoup(text, 'html.parser').findAll(text=True):
            name = node.strip()
            if name.startswith('('):
                continue
            links = mwparserfromhell.parse(node).filter_wikilinks()
            if links:
                for l in links:
                    n = l.text or l.title
                    results[n.lower()] = {'name': n, 'link': l.title}
                    self.warn(l.title or n)
            elif ',' in name:
                for n in name.split(','):
                    n = n.strip()
                    results[n.lower()] = {'name': n}
                    self.warn(n)
            else:
                results[name.lower()] = {'name': name}
                self.warn(name)
        return results

    def get_links_from_template(self, templates):
        results = {}
        for i, tag in enumerate(templates):
            tag_name = tag.name.strip().lower()
            if tag_name in self.bad_tags:
                continue
            if not tag.params:
                continue
            if tag_name == 'cite web':
                if i:
                    return results
                for item in tag.params:
                    item = item.strip()
                    if item.startswith('title='):
                        results.update(self.get_links_from_text(item[6:]))
                        break
            elif tag_name == 'collapsible list':
                try:
                    if 'list' not in tag.params[2].lower():
                        results.update(self.get_links_from_text(str(tag.params[2])))
                except IndexError:
                    pass
                results.update(self.get_links_from_text(self.clear_html(str(tag.params.pop()))))
            else:
                for item in tag.params:
                    if '\n' in item:
                        for sub_item in item.split('\n'):
                            results.update(self.template_item(sub_item))
                    else:
                        results.update(self.template_item(item))
        return results

    def template_item(self, item):
        results = {}
        item = item.strip('* ')
        if not item:
            return results
        for start in self.bad_item_starts:
            if item.startswith(start):
                return results
        for element in self.bad_item_elements:
            if element in item:
                return results
        links = mwparserfromhell.parse(item).filter_wikilinks()
        if links:
            for l in links:
                name = l.text or l.title
                results[name.lower()] = {'name': name, 'link': l.title}
                self.err(l.title or name)
        else:
            results[item.lower()] = {'name': item}
            self.err(item)
        return results

    def warn(self, text):
        pass

    def err(self, text):
        pass

    def pr(self, text):
        pass
