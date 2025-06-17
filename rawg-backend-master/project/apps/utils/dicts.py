from functools import reduce
from typing import Any


def merge(source: dict, destination: dict) -> Any:
    """
    >>> a = { 'first' : { 'all_rows' : { 'pass' : 'dog', 'number' : '1' } } }
    >>> b = { 'first' : { 'all_rows' : { 'fail' : 'cat', 'number' : '5' } } }
    >>> merge(b, a) == { 'first' : { 'all_rows' : { 'pass' : 'dog', 'fail' : 'cat', 'number' : '5' } } }
    True
    """
    for key, value in source.items():
        if isinstance(value, dict):
            merge(value, destination.setdefault(key, {}))
        else:
            destination[key] = value
    return destination


def find(data: dict, path: str, default: Any = None) -> Any:
    def get(d, v):
        return (d or {}).get(v) or {}
    return reduce(get, path.split('.'), data) or default
