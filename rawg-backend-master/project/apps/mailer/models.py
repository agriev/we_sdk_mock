import os

from django.conf import settings
from django.contrib.postgres.fields import CIEmailField
from django.db import models
from django.utils.timezone import now

from apps.utils.backend_storages import S3Boto3Storage
from apps.utils.upload import upload_to

fs = None
if settings.AWS_ACCESS_KEY_ID:
    fs = S3Boto3Storage(bucket_name=settings.AWS_STORAGE_BUCKET_NAME_EMAILS, custom_domain=None, location='')


def email_dump(instance, filename):
    path = [
        now().strftime('%Y'),
        now().strftime('%m'),
        now().strftime('%d'),
    ]
    if not settings.AWS_ACCESS_KEY_ID:
        path.insert(0, 'emails')
    filename = '{timestamp}-{email}-{slug}.eml'.format(
        timestamp=now().strftime('%H-%M-%S'),
        email=instance.user_email.replace('@', '_at_'),
        slug=instance.mail_slug,
    )
    return upload_to(
        folder=os.path.join(*path),
        instance=instance,
        filename=filename,
        pk=False,
        sub_dir=False,
        preserve_filename=True
    )


class Mail(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    user_email = CIEmailField(max_length=255)
    mail_slug = models.CharField(max_length=255)
    sent_at = models.DateTimeField(auto_now_add=True)
    subject = models.CharField(max_length=255)
    source = models.FileField(upload_to=email_dump, storage=fs)

    class Meta:
        verbose_name = 'Mailer'
        verbose_name_plural = 'Mailers'


class ViewedRecommendation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    game = models.ForeignKey('games.Game', models.CASCADE, db_index=False)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Viewed Recommendation'
        verbose_name_plural = 'Viewed Recommendations'
        unique_together = ('user', 'game')
        ordering = ('-id',)

    def __str__(self):
        return str(self.id)
