import inspect

try:
    import pydantic

    IS_AVAILABLE = True
except ImportError:
    IS_AVAILABLE = False


def is_pydantic(entity):
    if IS_AVAILABLE:
        return inspect.isclass(entity) and issubclass(entity, pydantic.main.BaseModel)
    else:
        return False


def get_fields(entity):
    return {key: field.type_ for key, field in entity.__fields__.items()}


def get_factory(fields, entity):
    return lambda *row: entity(**{k: v for k, v in zip(fields, row)})
