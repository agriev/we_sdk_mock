from multiupload.fields import MultiImageField, MultiUploadMetaInput


class CustomMultiUploadMetaInput(MultiUploadMetaInput):
    def render(self, name, value, attrs=None, **kwargs):
        if self.multiple:
            attrs['multiple'] = 'multiple'
        return super().render(name, value, attrs)


class ValidatedMultiImageField(MultiImageField):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.widget = CustomMultiUploadMetaInput(
            attrs=kwargs.pop('attrs', {}),
            multiple=(self.max_num is None or self.max_num > 1),
        )

    def run_validators(self, value):
        value = value or []
        for item in value:
            super().run_validators(item)

    def has_changed(self, initial, data):
        if data == [None]:
            data = None
        return super().has_changed(initial, data)
