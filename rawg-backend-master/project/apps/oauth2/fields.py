from datetime import datetime as dt

from django import forms


class UTCField(forms.DateTimeField):
    def prepare_value(self, value):
        if value == 0:
            value = None
        if isinstance(value, int):
            value = dt.fromtimestamp(value)
        return super().prepare_value(value)

    def to_python(self, value):
        if value in self.empty_values:
            return 0
        if not isinstance(value, int):
            return int(super().to_python(value).timestamp())
        return int(value)


def utc_input():
    input_formats = ['%d-%m-%Y %H:%M:%S', '%d-%m-%Y']

    now = dt.now()
    examples = ' | '.join(now.strftime(format_) for format_ in input_formats)
    return dict(input_formats=input_formats, help_text=f'Example: {examples}')
