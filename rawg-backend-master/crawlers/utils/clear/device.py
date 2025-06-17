from .name import clear_name


class DeviceName:
    @staticmethod
    def ios(name):
        result = ''
        for i, line in enumerate(name.split('-')[0]):
            if (line == line.upper() or line.isdigit()) and i != 1:
                result += ' ' + line
            else:
                result += line
        replaces = {
            ' 3 G': ' 3G',
            ' 4 G': ' 4G',
            ' 4 S': ' 4S',
            ' 9 7': ' 9.7',
            ' S E': ' SE',
        }
        for a, b in replaces.items():
            result = result.replace(a, b)
        return result

    @staticmethod
    def playstation(name):
        return clear_name(name, 'playstation')


def clear_device(name, store):
    try:
        return getattr(DeviceName, store)(name)
    except AttributeError:
        return name
