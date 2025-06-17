import logging
import os.path
import uuid

from django import forms
from django.contrib import admin
from django.contrib.admin.widgets import AutocompleteSelect
from django.contrib.postgres.forms import SimpleArrayField
from django.utils.functional import cached_property
from django.utils.text import slugify

from apps.games.models import Game
from apps.utils.backend_storages import WebDavStorage
from .fields import UTCField, utc_input
from .models import Client

logger = logging.getLogger(__name__)


def unique_pic_name(name, pic):
    _, ext = os.path.splitext(pic.name)
    return f'{slugify(name)}/pic/{uuid.uuid4().hex}{ext}'


class BaseClientForm(forms.ModelForm):
    game = forms.ModelChoiceField(
        queryset=Game.objects.filter(can_play=True, local_client=True),
        widget=AutocompleteSelect(Client._meta.get_field('game').remote_field, admin.site)
    )
    name = forms.CharField(min_length=5, max_length=30, required=True)  # papi restrictions
    redirect_uris = SimpleArrayField(
        forms.URLField(), delimiter='\n', widget=forms.Textarea(), max_length=5, min_length=1  # papi restrictions
    )
    client_secret_expires_at = UTCField(required=False, **utc_input())
    upload_pic = forms.FileField(required=False, label='Upload')

    class Meta:
        model = Client
        fields = ['game', 'name', 'redirect_uris', 'client_secret_expires_at', 'upload_pic']

    def clean_redirect_uris(self):
        uris = self.cleaned_data['redirect_uris']
        if len(set(uris)) != len(uris):
            self.add_error('redirect_uris', 'all URIs in the list must be unique.')
        return uris

    @property
    def papi_kwargs(self):
        return {
            key: self.cleaned_data[key]
            for key in self.cleaned_data.keys() & set(Client.papi_fields) - set(Client.read_only_papi_fields)
        }

    @cached_property
    def storage(self):
        return WebDavStorage()


class CreateClientAdminForm(BaseClientForm):
    def clean(self):
        super().clean()
        if self.instance.name_is_exists(name=self.cleaned_data.get('name')):
            raise forms.ValidationError({'name': 'This name already exists.'})
        if self.files.get('upload_pic'):
            try:
                name = unique_pic_name(self.cleaned_data['name'], self.files['upload_pic'])
                self.cleaned_data['pic'] = self.storage.save(name=name, content=self.files['upload_pic'])
            except self.storage.InvalidResponse as error:
                logger.error(f'Failed to save picture, error: {error}')
                raise forms.ValidationError({'upload_pic': 'Failed to save picture.'})

    def save(self, commit=True):
        if commit:
            self.instance.create_info(**self.papi_kwargs)
            self.instance.client_id = self.instance.info['client_id']
        return super().save(commit)


class ChangeClientAdminForm(BaseClientForm):
    client_secret = forms.CharField(widget=forms.TextInput(attrs={'size': 50}))
    client_id = forms.CharField(disabled=True, required=False, widget=forms.TextInput(attrs={'size': 50}))
    client_id_issued_at = UTCField(disabled=True, required=False)
    pic = forms.URLField(disabled=True, required=False, widget=forms.URLInput(attrs={'size': 100}), label='URL')
    clear_pic = forms.BooleanField(required=False, label='Delete')

    class Meta:
        model = Client
        fields = ['game', 'name', 'redirect_uris', 'client_secret_expires_at', 'client_secret', 'client_id',
                  'client_id_issued_at', 'upload_pic', 'pic', 'clear_pic']

    def get_initial_for_field(self, field, field_name):
        if self.instance and field_name == 'pic':
            return self.storage.url(self.instance.info['pic'])
        if self.instance and field_name in self.instance.papi_fields:
            return self.instance.info[field_name]
        return super().get_initial_for_field(field, field_name)

    def save(self, commit=True):
        if commit:
            self.instance.update_info(client_id=self.instance.client_id, **self.papi_kwargs)
        return super().save(commit)

    def clean(self):
        super().clean()
        if self.cleaned_data.get('clear_pic'):
            self._delete_pic()
            self.cleaned_data['pic'] = ''
        elif self.files.get('upload_pic'):
            self.cleaned_data['pic'] = self._rewrite_pic()

    def _delete_pic(self):
        if self.instance.info['pic']:
            try:
                self.storage.delete(self.instance.info['pic'])
            except self.storage.InvalidResponse as error:
                logger.error(f'Failed to delete picture, error: {error}')
                raise forms.ValidationError({'clear_pic': 'Failed to delete picture.'})
            except self.storage.FileNotFound as error:
                logger.error(f'Failed to delete picture,  error: {error}')

    def _rewrite_pic(self):
        name = unique_pic_name(self.cleaned_data['name'], self.files['upload_pic'])
        try:
            pic = self.storage.save(name=name, content=self.files['upload_pic'])
        except self.storage.InvalidResponse as error:
            logger.error(f'Failed to save picture, error: {error}')
            raise forms.ValidationError({'upload_pic': 'Failed to save picture.'})
        try:
            self._delete_pic()
        except forms.ValidationError:
            pass
        return pic
