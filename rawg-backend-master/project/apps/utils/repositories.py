from typing import Type

from django.db.models import Model
from django.db.models.fields.files import FieldFile


def get_file_url(model: Type[Model], field_name: str, path: str):
    if path:
        return FieldFile(None, model._meta.get_field('file'), path).url
    return None
