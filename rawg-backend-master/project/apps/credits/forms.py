from django import forms

from apps.credits.models import Person


class PersonAdminForm(forms.ModelForm):
    def clean(self):
        if self.instance and not self.instance.name and self.cleaned_data.get('display_name_en') and \
                self.Meta.model.objects.filter(name=self.cleaned_data['display_name_en']).count():
            raise forms.ValidationError(
                'The name %(value)s already exists',
                code='invalid',
                params={'value': self.cleaned_data['display_name_en']},
            )
        return super().clean()

    class Meta:
        model = Person
        exclude = ()
