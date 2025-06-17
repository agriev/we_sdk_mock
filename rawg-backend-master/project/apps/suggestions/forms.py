from django import forms

from apps.suggestions import models


class SuggestionAdminForm(forms.ModelForm):
    class Meta:
        model = models.Suggestion
        fields = ('name', 'description', 'limit')


class SuggestionFiltersAdminForm(forms.ModelForm):
    class Meta:
        model = models.SuggestionFilters
        exclude = ('id',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in (
            'from_date',
            'to_date',
            'from_now',
            'to_now',
            'released_only',
            'ordering',
        ):
            self.fields[field].required = False
