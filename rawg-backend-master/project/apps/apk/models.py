import os

from django.db import models


def apk_app_file_path(instance, filename):
    _, extension = os.path.splitext(filename)
    return f'apk_files/{instance.version}{extension}'


class APK(models.Model):
    version = models.CharField('version', max_length=20, unique=True)
    app_file = models.FileField('file', upload_to=apk_app_file_path)
    created = models.DateTimeField('created', auto_now_add=True, editable=False)
    active = models.BooleanField('active', default=False, db_index=True)

    class Meta:
        verbose_name = 'APK file'
        verbose_name_plural = 'APK files'
        constraints = [
            models.UniqueConstraint(
                condition=models.Q(active=True),
                fields=['active'],
                name='apk_active_constraint'
            )
        ]
