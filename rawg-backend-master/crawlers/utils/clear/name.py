class Name:
    replaces = {
        'android': [
            ('™', ' '),
            ('®', ' '),
            (' : ', ': '),
        ],
        'gog': [
            ('™', ' '),
            ('®', ' '),
            ('Pre-Order', ''),
            (' : ', ': '),
        ],
        'ios': [
            ('™', ' '),
            ('®', ' '),
            (' : ', ': '),
        ],
        'itch': [
            ('™', ' '),
            ('®', ' '),
            (' : ', ': '),
        ],
        'nintendo': [
            ('™', ' '),
            ('®', ' '),
            ('Digital Version', ''),
            (' : ', ': '),
        ],
        'old': [],
        'playstation': [
            ('®/', '/'),
            ('™/', '/'),
            ('®)', ')'),
            ('™)', ')'),
            ('®]', ']'),
            ('™]', ']'),
            ('™', ' '),
            ('®', ' '),
            ('(Vita)', ''),
            ('(PS3)', ''),
            ('(PS4)', ''),
            ('(PS2 Classic)', ''),
            ('(PS2 classic)', ''),
            ('(PSONE CLASSIC)', ''),
            ('(PSOne Classic)', ''),
            ('(PSone Classic)', ''),
            ('(PSOne classic)', ''),
            ('(PS One Classic)', ''),
            ('(PSOne Clasic)', ''),
            ('(PS3 Only)', ''),
            ('(PS3/PSP)', ''),
            ('(PS3/PSP/PS Vita)', ''),
            ('(PS3/PSP/VITA)', ''),
            ('(PS3/PSP/PS VITA)', ''),
            ('(Game and PS4 Theme)', ''),
            ('(Game and Theme)', ''),
            ('Standard Edition', ''),
            (' : ', ': '),
        ],
        'steam': [
            ('<sup>', ''),
            ('</sup>', ''),
            ('™', ' '),
            ('®', ' '),
            ('Standard Edition', ''),
            ('Steam Edition', ''),
            ('Steam Special Edition', ''),
            (' : ', ': '),
        ],
        'xbox': [
            ('™', ' '),
            ('®', ' '),
            ('Standard Edition', ''),
            (' : ', ': '),
            (' - Xbox', ''),
        ],
        'xbox360': [
            ('™', ' '),
            ('®', ' '),
            ('Standard Edition', ''),
            (' : ', ': '),
            (' - Xbox', ''),
        ],
    }

    @staticmethod
    def gog(name):
        the = 'The'
        part = ', The'
        if name.endswith(part):
            name = '{} {}'.format(the, name[0:-len(part)])
        part = ', The -'
        if part in name:
            name = '{} {}'.format(the, name.replace(part, ' -'))
        return name

    @classmethod
    def clear(cls, name, store):
        for k, v in cls.replaces[store]:
            if k in name:
                name = ' '.join(name.replace(k, v).split())
        return ' '.join(name.split()).strip('-: ')


def clear_name(name, store):
    if not name:
        return name
    name = Name.clear(name, store)
    try:
        return getattr(Name, store)(name)
    except (AttributeError, TypeError):
        return name
