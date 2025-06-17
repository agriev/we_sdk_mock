import requests
from django.conf import settings


def send_info(text, username=None, icon_emoji=None, channel=None):
    slack_hook = settings.SLACK_HOOK
    if not slack_hook:
        return
    requests.post(slack_hook, json={
        'channel': channel or settings.SLACK_CHANEL,
        'icon_emoji': icon_emoji or ':timer_clock:',
        'text': text,
        'username': username or 'crontab',
    })
