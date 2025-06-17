from django import template

register = template.Library()


@register.filter()
def clear_spaces(data):
    return data.replace(' ', '')


@register.filter()
def get(value, arg):
    if type(value) is dict:
        return value.get(arg)
    else:
        return value[arg]


@register.filter
def addstr(arg1, arg2):
    return str(arg1) + str(arg2)
