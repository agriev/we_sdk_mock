from django import forms

from apps.merger.models import SimilarGame


class AdminMergeGamesForm(forms.Form):
    _selected_action = forms.CharField(widget=forms.MultipleHiddenInput)

    def __init__(self, request, *args, **kwargs):
        super().__init__(*args, **kwargs)
        items = SimilarGame.objects.filter(id__in=kwargs.get('initial').get('_selected_action'))
        for similar in items:
            self.fields['similar_{}'.format(similar.id)] = forms.ChoiceField(
                label='{}'.format(similar.id),
                choices=(
                    (similar.first_game_id, similar.first_game.admin_name),
                    (similar.second_game_id, similar.second_game.admin_name)
                ),
                widget=forms.RadioSelect
            )

    def clean__selected_action(self):
        return eval(self.cleaned_data.get('_selected_action', '[]'))
