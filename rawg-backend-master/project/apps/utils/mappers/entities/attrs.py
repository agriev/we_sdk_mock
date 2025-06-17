import inspect

try:
    import attr

    IS_AVAILABLE = True
except ImportError:
    IS_AVAILABLE = False


def is_attrs(entity):
    if IS_AVAILABLE:
        return inspect.isclass(entity) and attr.has(entity)
    else:
        return False


def get_fields(entity):
    return {attribute.name: attribute.type for attribute in entity.__attrs_attrs__}


def get_factory(fields, entity):
    return entity
