from bs4 import BeautifulSoup
from django import forms
from django.conf import settings

from apps.games.models import Collection, Game, GamePlatform
from apps.utils.fields.mulitimage import ValidatedMultiImageField

promo_field = forms.CharField(widget=forms.Select(choices=settings.PROMO_SELECTS), required=False)


class MergeGamesAdminForm(forms.Form):
    _selected_action = forms.CharField(widget=forms.MultipleHiddenInput)

    def __init__(self, request, *args, **kwargs):
        super().__init__(*args, **kwargs)
        items = Game.objects.filter(id__in=kwargs.get('initial').get('_selected_action'))
        first = items.first()
        second = items.last()
        self.fields['similar'] = forms.ChoiceField(
            choices=(
                (first.id, 'Name - {}, Slug - {}'.format(first.admin_name, first.slug)),
                (second.id, 'Name - {}, Slug - {}'.format(second.admin_name, second.slug))
            ),
            widget=forms.RadioSelect
        )

    def clean__selected_action(self):
        return eval(self.cleaned_data.get('_selected_action', '[]'))


class GameAdminForm(forms.ModelForm):
    attachments = ValidatedMultiImageField(
        label='Bulk loading of screenshots', required=False, min_num=1, max_num=20, max_file_size=1024 * 1024 * 20
    )
    promo = promo_field

    class Meta:
        model = Game
        exclude = ()
        widgets = {
            'description_short': forms.Textarea(),
        }

    def __init__(self, *args, **kwargs):
        instance = kwargs.get('instance')
        if not kwargs.get('initial'):
            kwargs['initial'] = {}
        if instance and instance.synonyms:
            for i, synonym in enumerate(instance.synonyms):
                kwargs['initial']['synonym{}'.format(i)] = synonym
        if instance and instance.alternative_names:
            for i, alternative_name in enumerate(instance.alternative_names):
                kwargs['initial']['alternative_names{}'.format(i)] = alternative_name
        if (instance and (not instance.released or self.default_released == instance.released)) or not instance:
            kwargs['initial']['released'] = ''
        super().__init__(*args, **kwargs)
        if self.fields.get('released'):
            self.fields['released'].required = False

    def clean(self):
        can_play_verbose = self.Meta.model._meta.get_field('can_play').verbose_name.capitalize()
        iframe_verbose = self.Meta.model._meta.get_field('iframe').verbose_name.capitalize()
        local_client_verbose = self.Meta.model._meta.get_field('local_client').verbose_name.capitalize()

        if self.cleaned_data.get('can_play') and not self.cleaned_data.get('iframe') and not self.cleaned_data.get('local_client'):
            self.add_error('can_play', f'Если "{can_play_verbose}" включено, то должно быть включено'
                                       f' "{local_client_verbose}" И/ИЛИ заполнено "{iframe_verbose}"')

        for field in ['play_on_mobile', 'play_on_desktop', 'seamless_auth', 'alternative_fullscreen']:
            if self.cleaned_data.get('iframe') and self.cleaned_data.get(field) is None:
                self.add_error(field, f'Если "{iframe_verbose}" заполнено, то значение должно быть установлено')
            elif not self.cleaned_data.get('iframe') and self.cleaned_data.get(field) is not None:
                self.add_error(field, f'Если "{iframe_verbose}" пустое, то значение должно быть сброшено')

        if not self.cleaned_data.get('released'):
            self.cleaned_data['released'] = self.default_released
        return super().clean()

    @property
    def default_released(self):
        return self.Meta.model._meta.get_field('released').get_default()


class GameAdminListForm(forms.ModelForm):
    promo = promo_field

    class Meta:
        model = Game
        exclude = ()


class CollectionAdminForm(forms.ModelForm):
    promo = promo_field

    class Meta:
        model = Collection
        exclude = ()


class GamePlatformForm(forms.ModelForm):
    minimum_en = forms.CharField(widget=forms.Textarea, required=False)
    recommended_en = forms.CharField(widget=forms.Textarea, required=False)
    minimum_ru = forms.CharField(widget=forms.Textarea, required=False)
    recommended_ru = forms.CharField(widget=forms.Textarea, required=False)

    class Meta:
        model = GamePlatform
        exclude = ()

    def __init__(self, *args, **kwargs):
        instance = kwargs.get('instance')
        if instance:
            kwargs['initial'] = {}
            for lang, _ in settings.LANGUAGES:
                req = getattr(instance, f'requirements_{lang}', None)
                if not req:
                    continue
                if req.get('minimum'):
                    kwargs['initial'][f'minimum_{lang}'] = req['minimum']
                if req.get('recommended'):
                    kwargs['initial'][f'recommended_{lang}'] = req['recommended']
        super().__init__(*args, **kwargs)

    def save(self, commit=True):
        for lang, _ in settings.LANGUAGES:
            data = {}
            if self.cleaned_data[f'minimum_{lang}']:
                data['minimum'] = self.get_plain_text(self.cleaned_data[f'minimum_{lang}'])
            if self.cleaned_data[f'recommended_{lang}']:
                data['recommended'] = self.get_plain_text(self.cleaned_data[f'recommended_{lang}'])
            setattr(self.instance, f'requirements_{lang}', data or None)
        return super().save(commit)

    def get_plain_text(self, data):
        soup = BeautifulSoup(data, 'html.parser')
        return soup.get_text()
