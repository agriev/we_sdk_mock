from urllib.parse import urlparse

from rest_framework import serializers
from rest_framework.fields import empty


class RedditField(serializers.CharField):
    def run_validation(self, data=empty):
        if data == empty:
            return super().run_validation(data)
        elif data == '':
            valid_data = ''
        elif data.startswith('/r/'):
            valid_data = data
        elif urlparse(data).netloc in ('reddit.com', 'www.reddit.com'):
            valid_data = data
        else:
            raise serializers.ValidationError(
                'Invalid Reddit URL, Please enter valid Reddit URL or /r/Subreddit',
            )
        return valid_data


class MetacriticField(serializers.URLField):
    def run_validation(self, data=empty):
        if data == empty:
            return super().run_validation(data)
        elif data == '':
            return ''
        elif urlparse(data).netloc in ('metacritic.com', 'www.metacritic.com'):
            return data
        else:
            raise serializers.ValidationError(
                'Invalid Metacritic URL, Please enter valid.',
            )
