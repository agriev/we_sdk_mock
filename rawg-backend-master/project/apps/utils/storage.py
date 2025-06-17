from django.conf import settings
from django.core.files.storage import default_storage


def default_storage_chunks_save(name, fp):
    # https://github.com/jschneier/django-storages/issues/383
    file = default_storage.open(name)
    if settings.AWS_ACCESS_KEY_ID:
        file = file.obj.get()['Body']
    while True:
        chunk = file.read(100000000)
        if not chunk:
            break
        fp.write(chunk)
    file.close()
