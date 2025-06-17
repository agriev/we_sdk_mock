from hashlib import sha1

import requests
from django.conf import settings
from django.contrib.auth.password_validation import MinimumLengthValidator as DefaultMinimumLengthValidator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext, ngettext

from apps.utils.exceptions import capture_exception


class MinimumLengthValidator(DefaultMinimumLengthValidator):
    def validate(self, password, user=None):
        if len(password) < self.min_length:
            raise ValidationError(
                ngettext(
                    'Your password is too short. You need %(min_length)d+ character.',
                    'Your password is too short. You need %(min_length)d+ characters.',
                    self.min_length
                ),
                code='password_too_short',
                params={'min_length': self.min_length},
            )


class LeakedPasswordValidator:
    """
    Search password hash in pwned passwords database and
    notify if exact hash found
    """

    def get_hashes(self, hash_head):
        try:
            response = requests.get(
                url=settings.PWNED_PASSWORDS_API_URL.format(
                    hash_head
                ),
                timeout=settings.EXTERNAL_TIMEOUT
            )

            return [
                item.split(':')[0]
                for item in
                response.text.split()
            ]
        except Exception as e:
            capture_exception(e)
            return []

    def validate(self, password, user=None):
        hash_object = sha1(str.encode(password))
        hex_dig = hash_object.hexdigest()
        hash_head, hash_suffix = hex_dig[:5], hex_dig[5:]

        leaked_hashes = self.get_hashes(hash_head)

        if not leaked_hashes:
            pass
        if hash_suffix.upper() in leaked_hashes:
            raise ValidationError(
                gettext(
                    'This password is not safe. Please, create another.'
                )
            )
        else:
            pass

    def get_help_text(self):
        return gettext(str())
