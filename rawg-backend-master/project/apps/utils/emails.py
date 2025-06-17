import requests
from cachetools.func import ttl_cache
from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils.timezone import now

from apps.utils.lang import get_site_by_current_language, get_site_by_language

DISPOSABLE_MAILS_URL = (
    'https://gist.githubusercontent.com/CodeKJ/'
    '543a78f8a3264ddde91240d717986f84/raw/b8e8b4afff1000d7869e6e4d2b3b8aa404ad9be7/blacklist-mx.txt'
)


def send(template_prefix, context, to_emails, from_email=None, subject=None, language=None):
    context.update({
        'protocol': 'https',
        'current_site': (get_site_by_language(language=language) if language else get_site_by_current_language()).name,
        'year': now().year
    })
    if not from_email:
        if language:
            from_email = settings.DEFAULT_FROM_EMAILS[language]
        else:
            from_email = settings.DEFAULT_FROM_EMAIL
    if not subject:
        subject = render_to_string('{0}_subject.txt'.format(template_prefix), context)
        subject = ''.join(subject.splitlines())
    body = render_to_string('{0}_message.html'.format(template_prefix), context).strip()
    msg = EmailMessage(subject, body, from_email, to_emails)
    msg.content_subtype = 'html'
    msg.send()
    return msg


@ttl_cache(maxsize=1, ttl=3600)
def disposable_emails():
    return requests.get(DISPOSABLE_MAILS_URL).text.split('\n')
