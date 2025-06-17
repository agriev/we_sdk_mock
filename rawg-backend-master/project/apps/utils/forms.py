from django import forms


class AdminMergeItemsForm(forms.Form):
    _selected_action = forms.CharField(widget=forms.MultipleHiddenInput)

    def __init__(self, model, *args, **kwargs):
        super().__init__(*args, **kwargs)
        items = model.objects.filter(id__in=self.initial['_selected_action'])
        choices = []
        for item in items:
            choices.append((item.id, 'Name - {}, Slug - {}'.format(item.name, item.slug)))
        self.fields['item'] = forms.ChoiceField(label='Select main item', choices=choices, widget=forms.RadioSelect)

    def clean__selected_action(self):
        return eval(self.cleaned_data.get('_selected_action', '[]'))
