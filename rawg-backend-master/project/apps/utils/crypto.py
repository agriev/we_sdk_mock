import hmac
from hashlib import sha256
from typing import Iterable

SEPARATOR = '._.'


def generate_signature(chunks: Iterable[str], secret: str, sep: str = SEPARATOR, func=sha256) -> str:
    return hmac.new(secret.encode(), sep.join(chunks).encode(), func).hexdigest()


def check_signature(signature: str, chunks: Iterable[str], secret: str, sep: str = SEPARATOR, func=sha256) -> bool:
    return hmac.compare_digest(signature, generate_signature(chunks, secret, sep, func))


def check_signature_from_message(signture: str, message: bytes, secret: str, func=sha256) -> bool:
    return hmac.compare_digest(signture, hmac.new(secret.encode('ascii'), message, func).hexdigest())
