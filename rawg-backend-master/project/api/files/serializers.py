from collections import OrderedDict

from django.template.defaultfilters import date, filesizeformat, linebreaksbr
from rest_framework import serializers

from apps.files import models
from apps.utils.strings import keep_tags


class SoftwareSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Software
        fields = ('id', 'name', 'description')
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['name'] = instance.full_name
        attrs = OrderedDict([])
        if instance.ui:
            attrs['Интерфейс'] = instance.get_ui_display()
        if instance.rus:
            attrs['Поддержка русского языка'] = instance.get_rus_display()
        if instance.systems:
            attrs['Операционные системы'] = ', '.join(instance.all_systems_dict[sys] for sys in instance.systems)
        if instance.developer:
            attrs['Разработчик'] = instance.developer
        if instance.developer_url:
            data['url'] = instance.developer_url
        if instance.type:
            attrs['Тип распространения'] = instance.get_type_display()
        if instance.price:
            attrs['Цена полной версии'] = instance.price
        categories = ', '.join(category.name for category in instance.categories.all())
        if categories:
            attrs['Категории'] = categories
        data['attrs'] = [{'name': name, 'value': value} for name, value in attrs.items()]
        if self.context['view'].action == 'retrieve':
            files = []
            for file in instance.softwarefile_set.order_by('-id'):
                files.append({
                    'name': file.name,
                    'attrs': [
                        {'name': 'Размер файла', 'value': filesizeformat(file.file_size)},
                        {'name': 'Файл добавлен', 'value': date(file.created)},
                    ],
                    'url': file.file.url.replace('https://cdn.ag.ru/media/', 'https://downloads.ag.ru/')
                    if file.file else None,
                })
            data['files'] = files
        data['description'] = keep_tags(data['description'])
        return data


class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.File
        fields = ('id', 'name', 'description')
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        attrs = OrderedDict([])
        attrs['Размер файла'] = filesizeformat(instance.file_size)
        if instance.category == models.File.CATEGORY_2:
            attrs['Поддерживаемые версии'] = ', '.join(
                models.LANGUAGES[lang] for lang in instance.languages if lang and lang in models.LANGUAGES
            )
            attrs['Поддерживаемые ОС'] = 'Windows ' + '/'.join(
                instance.all_windows_dict[ver] for ver in instance.windows
            )
        attrs['Файл добавлен'] = date(instance.created)
        data['attrs'] = attrs
        data['url'] = (
            instance.file.url.replace('https://cdn.ag.ru/media/', 'https://downloads.ag.ru/')
            if instance.file else None
        )
        data['description'] = linebreaksbr(keep_tags(data['description']))
        return data
