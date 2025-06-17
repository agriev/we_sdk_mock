from pathlib import Path
from urllib import parse

import requests
from django.conf import settings
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage as BaseFileSystemStorage, Storage as BaseStorage
from django.utils.http import urlquote
from storages.backends.s3boto3 import S3Boto3Storage as BaseS3Boto3Storage


class CacheExistsMixin:
    def exists_both(self, name):
        return self.exists(name)

    def exists_with_cache(self, name, disable_cache=False, is_both=True):
        cache_key = self.get_cache_key(name)
        cache_result = cache.get(cache_key)
        if cache_result is None or disable_cache:
            cache_result = self.exists_both(name) if is_both else self.exists(name)
            if cache_result:
                cache.set(cache_key, cache_result, 60 * 60)
        return cache_result

    def get_cache_key(self, name):
        return 's3boto3storage_{}'.format(urlquote(name))

    def is_dir(self, name):
        return False


class ReplaceExistsMixin:
    def replace(self, name):
        for d in settings.REPLACE_FILES_IN_DIRS:
            if name.startswith('{}/'.format(d)):
                return True
        return False


class S3Boto3Storage(CacheExistsMixin, ReplaceExistsMixin, BaseS3Boto3Storage):
    def get_available_name(self, name, max_length=None):
        if self.replace(name):
            return self._clean_name(name)
        return super().get_available_name(name, max_length)


class GameFilesS3Boto3Storage(S3Boto3Storage):
    location = settings.GAMES_FILES_LOCATION

    def replace(self, name):
        return True


class FileSystemStorage(CacheExistsMixin, ReplaceExistsMixin, BaseFileSystemStorage):
    def get_available_name(self, name, max_length=None):
        if self.replace(name):
            self.delete(name)
            return name
        return super().get_available_name(name, max_length)

    def is_dir(self, name):
        return Path(settings.MEDIA_ROOT, name).is_dir()


class WebDavStorage(BaseStorage):
    class InvalidResponse(Exception):
        pass

    class FileNotFound(Exception):
        pass

    class InvalidFileName(Exception):
        pass

    def __init__(self, uri=None):
        config = settings.DAV_STORE_CONFIG
        self.external_address = config['EXTERNAL_ADDRESS']
        if uri is None:
            self.uri = parse.urlunparse([config['SCHEME'], config['HOST'], config['PATH'], '', '', ''])
        else:
            self.uri = uri.strip('/')

    def delete(self, name):
        if not name:
            raise self.InvalidFileName('The name argument is not allowed to be empty.')
        url = self._full_uri(name)
        response = requests.delete(url)
        if response.status_code == 404:
            raise self.FileNotFound(f'File not found (url: {url})')
        if response.status_code != 204:
            raise self.InvalidResponse(f'Unexpected response status: {response.status_code} (url: {url})')

    def exists(self, name):
        url = self._full_uri(name)
        response = requests.head(url)
        if response.status_code not in [200, 404]:
            raise self.InvalidResponse(f'Unexpected response status: {response.status_code} (url: {url})')
        return response.status_code == 200

    def _save(self, name, content):
        content.seek(0)
        data = content.read()
        url = self._full_uri(name)
        resp = requests.put(url, data=data)
        try:
            resp.raise_for_status()
        except requests.exceptions.HTTPError as error:
            raise self.InvalidResponse(f'Invalid response: {error} (url: {url})') from error
        return name

    def url(self, name):
        if not name:
            return ''
        return parse.urljoin(self.external_address + '/', name.strip('/'))

    def _full_uri(self, name):
        return parse.urljoin(self.uri + '/', name.strip('/'))

    def _open(self, name, mode='rb'):
        url = self._full_uri(name)
        response = requests.get(url)

        if response.status_code == 404:
            raise self.FileNotFound(f'File not found (url: {url})')
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as error:
            raise self.InvalidResponse(f'Invalid response: {error} (url: {url})') from error

        f = ContentFile(response.content)
        f.seek(0)
        return f
