from django.conf import settings
from django.db import models

from apps.utils.images import field_to_png_or_jpg
from apps.utils.models import InitialValueMixin
from apps.utils.upload import upload_to


def user_image(instance, filename):
    return upload_to('user_images', instance, filename, False, True)


class UserImage(InitialValueMixin, models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    image = models.ImageField(upload_to=user_image)
    created = models.DateTimeField(auto_now_add=True)

    init_fields = ('image',)

    def save(self, *args, **kwargs):
        if self.image and self.is_init_change('image', kwargs):
            self.image = field_to_png_or_jpg(self.image, 'gif')
        super().save(*args, **kwargs)

    def __str__(self):
        return str(self.image)

    class Meta:
        ordering = ('-id',)
        verbose_name = 'User image'
        verbose_name_plural = 'User images'
