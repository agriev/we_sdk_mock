# todo check https://github.com/neithere/django-autoslug/pull/18 and fix migrations after deleting

from autoslug import AutoSlugField as OriginalAutoSlugField, utils
from autoslug.fields import modeltranslation_update_slugs
from autoslug.settings import autoslug_modeltranslation_enable
from django.conf import settings
from django.contrib.postgres.fields import CIText
from django.db.models.signals import post_save

try:
    from south.modelsinspector import introspector
except ImportError:
    def introspector(self):
        return [], {}

try:
    from modeltranslation import utils as modeltranslation_utils
except ImportError:
    modeltranslation_utils = None


class CIAutoSlugField(CIText, OriginalAutoSlugField):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def pre_save(self, instance, add):

        # get currently entered slug
        value = self.value_from_object(instance)

        manager = self.manager

        # autopopulate
        if self.always_update or (self.populate_from and not value):
            value = utils.get_prepopulated_value(self, instance)

            # pragma: nocover
            if __debug__ and not value and not self.blank:
                print(
                    'Failed to populate slug %s.%s from %s' %
                    (instance._meta.object_name, self.name, self.populate_from)
                )

        slug = None
        if value:
            slug = self.slugify_local(value)
        if not slug:
            slug = None

            if not self.blank:
                slug = instance._meta.model_name
            elif not self.null:
                slug = ''

        if slug:
            slug = utils.crop_slug(self, slug)

            # ensure the slug is unique (if required)
            if self.unique or self.unique_with:
                slug = utils.generate_unique_slug(self, instance, slug, manager)

            assert slug, 'value is filled before saving'

        # make the updated slug available as instance attribute
        setattr(instance, self.name, slug)

        # modeltranslation support
        if 'modeltranslation' in settings.INSTALLED_APPS \
                and not hasattr(self.populate_from, '__call__') \
                and autoslug_modeltranslation_enable:
            post_save.connect(modeltranslation_update_slugs, sender=type(instance))

        return slug

    def slugify_local(self, value):
        value = utils.slugify(value)
        return None if value.isdigit() else value
