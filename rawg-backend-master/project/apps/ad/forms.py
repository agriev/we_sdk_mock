from django.forms import ModelForm

from .models import AdFoxCompanyParameter


class AdFoxCompanyParameterForm(ModelForm):
    class Meta:
        model = AdFoxCompanyParameter
        fields = ('company', 'name', 'value')
