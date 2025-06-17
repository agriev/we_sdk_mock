from django.core import validators
from django.utils.deconstruct import deconstructible
from django.utils.translation import gettext_lazy as _


@deconstructible
class UsernameValidator(validators.RegexValidator):
    regex = r'^[0-9a-zA-Z-_]+$'
    message = _(
        'Enter a valid username. This value may contain only letters, numbers, and -/_ characters.'
    )
