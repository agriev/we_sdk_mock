import copy
import random
import string
import unicodedata
from html import unescape
from parser import ParserError

import markdown as md
import roman
from bs4 import BeautifulSoup
from django.conf import settings
from django.template.defaultfilters import striptags, urlize
from django.utils.html import escape
from django.utils.safestring import SafeData, mark_safe
from django.utils.text import normalize_newlines
from lxml import etree, html
from lxml.html import fromstring, tostring
from lxml.html.clean import Cleaner


def code():
    return ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(10))


def convert_numbers_from_roman(name):
    words = []
    for word in name.split(' '):
        try:
            w = word.strip(string.punctuation).upper()
            number = roman.fromRoman(w)
            words.append(word.lower().replace(roman.toRoman(number).lower(), str(number)))
        except (roman.InvalidRomanNumeralError, roman.OutOfRangeError):
            words.append(word)
    return ' '.join(words)


def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


def normalize_apostrophes(s):
    chars = ('"', '’', '`', '՚', 'ʼ', 'ˮ', 'ߴ', 'ߵ')
    for char in chars:
        s = s.replace(char, "'")
    return s


def markdown(value, autoescape=True):
    autoescape = autoescape and not isinstance(value, SafeData)
    if autoescape:
        value = escape(value)
    value = normalize_newlines(value)
    value = value.replace('\n', '  \n')  # convert new lines to br
    value = md.markdown(value)
    value = value.replace('  </p>', '</p>')  # clean
    return mark_safe(value)


class KeepTagsCleaner(Cleaner):
    kill_tags = frozenset(['embed', 'iframe', 'img'])
    allow_tags = frozenset(['p', 'br', 'strong', 'em', 'ul', 'li', 'ol'])
    remove_unknown_tags = False
    frames = False
    embedded = False
    safe_attrs = frozenset([])
    host_whitelist = frozenset([''])


def keep_tags(
    text, allow_tags=None, safe_attrs=None, kill_tags=None, replace_allow_tags=False, replace_kill_tags=False
):
    if not text:
        return ''
    text = '<div>{}</div>'.format(text)
    try:
        cleaner = KeepTagsCleaner()
        if allow_tags:
            new_tags = set(KeepTagsCleaner.allow_tags) if not replace_allow_tags else set()
            for tag in allow_tags:
                new_tags.add(tag)
            cleaner.allow_tags = new_tags
        if kill_tags:
            new_kills = set(KeepTagsCleaner.kill_tags) if not replace_kill_tags else set()
            for tag in kill_tags:
                new_kills.add(tag)
            cleaner.kill_tags = new_kills
        if safe_attrs:
            new_attrs = set(KeepTagsCleaner.safe_attrs)
            for attr in safe_attrs:
                new_attrs.add(attr)
            cleaner.safe_attrs = new_attrs
        text = cleaner.clean_html(text)
    except (ParserError, UnicodeDecodeError):
        return ''
    if text[0:5] == '<div>':
        text = text[5:-6]
    return text


class ProjectCleaner(Cleaner):
    kill_tags = {'embed', 'iframe', 'img'}
    allow_tags = {'embed', 'iframe', 'img', 'br', 'div'}
    remove_unknown_tags = False
    frames = False
    embedded = False
    host_whitelist = settings.ALLOWED_HOSTS_IN_TEXT
    whitelist_tags = {'embed', 'iframe', 'img'}
    safe_attrs = set(list(html.defs.safe_attrs) + ['sandbox', 'allowfullscreen'])

    def __init__(self, **kw):
        self._tag_link_attrs['img'] = 'src'
        super().__init__(**kw)


def remove_classes(text):
    text = fromstring(text)
    for tag in text.xpath('//*[@class]'):
        classes = tag.attrib.pop('class')
        classes = ' '.join(cls for cls in classes.split(' ') if cls in settings.ALLOWED_CLASSES_IN_TEXT)
        if classes:
            tag.attrib['class'] = classes
    return tostring(text).decode('utf-8')


def remove_br(text):
    soup = BeautifulSoup(text, 'html.parser')
    for node in soup.findAll('br'):
        node.replace_with(BeautifulSoup('', 'html.parser'))
    return str(soup)


def urlize_html(text):
    soup = BeautifulSoup(text, 'html.parser')
    for node in soup.findAll(text=True):
        if node.parent and getattr(node.parent, 'name', None) == 'a':
            continue
        node.replace_with(BeautifulSoup(urlize(node, True), 'html.parser'))
    return str(soup)


def safe_text(text):
    if not text:
        return text
    try:
        text = remove_classes(ProjectCleaner().clean_html(text))
    except (ParserError, UnicodeDecodeError):
        return ''
    text = urlize_html(text)
    text = text.replace('allowfullscreen=""', 'allowfullscreen')
    text = text.strip()
    if text[0:5] == '<div>':
        text = text[5:-6]
    # remove end linebreaks from the frontend editor
    if text[-10:] == '<br/><br/>':
        text = text[0:-10]
    if text[-5:] == '<br/>':
        text = text[0:-5]
    if text[-22:] == '</div><br/><br/></div>':
        text = '{}</div></div>'.format(text[0:-22])
    return text


def bare_text(text):
    if not text:
        return '', '', [], 0
    try:
        dom = html.fragment_fromstring(text)
    except etree.ParserError:
        dom = html.fragment_fromstring('<article>{}</article>'.format(text))
    preview = ''
    counters = {'img': 0, 'other': 0}
    previews = []
    for div in dom.cssselect('div'):
        if div.getchildren() and div.getchildren()[0].getchildren():
            tag = div.getchildren()[0].getchildren()[0].tag
            element = etree.tostring(div, method='html', with_tail=False).decode('utf-8')
            if not preview:
                preview = element
            if counters['img'] + counters['other'] == 4:
                break
            if tag == 'img':
                counters[tag] += 1
                previews.append(element)
            elif not counters['other']:
                counters['other'] += 1
                previews.append(element)
    counter = 0
    for div in dom.cssselect('img'):
        counter += 1
    for div in dom.cssselect('iframe'):
        counter += 1
    for div in dom.cssselect('embed'):
        counter += 1
    return unescape(striptags(text.replace('<br/>', ' '))), preview, previews, counter


def share_text(text, link, length=settings.TWITTER_LENGTH):
    count = length - len(link) - 2
    return '{}… {}'.format(text[0:count].strip(' .,:;-!?'), link)


def get_plain_text(data, separator='\n'):
    soup = BeautifulSoup(data, 'html.parser')
    for script in soup(['script', 'style', '[document]', 'head', 'title']):
        script.extract()
    text = soup.get_text(separator=separator)
    return '\n'.join(line.strip() for line in text.splitlines() if line)


def br_to_new_line(data):
    soup = BeautifulSoup(data, 'html.parser')
    for br in soup.find_all('br'):
        br.replace_with('\n')
    return soup.text


def add_img_attribute(text, attribute_template, attribute_name):
    soup = BeautifulSoup(text, 'html.parser')
    for index, tag in enumerate(soup.find_all('img'), 1):
        if tag.get(attribute_name, None):
            continue
        new_tag = copy.deepcopy(tag)
        new_tag[attribute_name] = attribute_template.format(index)
        tag.replace_with(new_tag)
    return str(soup)


def get_int_from_string_or_none(text, only_start=False):
    digits = []
    for symbol in text:
        if symbol.isdigit():
            digits.append(symbol)
        elif only_start:
            break
    return int(''.join(digits)) if digits else None
