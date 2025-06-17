import os
import random
from hashlib import md5


def upload_to(folder, instance, filename, pk=True, sub_dir=True, preserve_filename=False):
    try:
        name, ext = filename.rsplit('.', 1)
    except ValueError:
        name = filename
        ext = 'jpg'
    if pk:
        assert instance.id, 'This works only with an existed instance'
        name = str(instance.id).zfill(3)
    elif not preserve_filename:
        name = md5('{}{}'.format(random.randint(1, 100000), filename).encode('utf-8')).hexdigest()
    path = [folder]
    if sub_dir:
        path.append(name[0:3])
    path.append(u'{}.{}'.format(name, ext))
    return os.path.join(*path)
