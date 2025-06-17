checks = {
    'android': [
        'quiz',
        'guess',
        'trivia',
        'keyboard',
        'calculator',
        'emulator',
        'wallpaper',
    ],
    'gog': [
        'edition'
    ],
    'ios': [
        'quiz',
        'guess',
        'trivia',
        'keyboard',
        'calculator',
        'emulator',
        'wallpaper',
    ],
    'itch': [],
    'nintendo': [
        'bundle',
        'edition',
        'dual pack',
    ],
    'old': [
        'video games',
    ],
    'playstation': [
        'bundle',
        'ps vita collection',
        'edition',
        'digital',
        'double pack',
        'triple pack',
        'pre-order',
    ],
    'steam': [],
    'xbox': [
        'bundle',
        'edition',
        'pre-order',
    ],
    'xbox360': [
        'bundle',
        'edition',
        'pre-order',
        'avatar content only',
        'avatar store',
    ],
}


def check(name, store):
    if not name:
        return False
    for e in checks[store]:
        if e.lower() in name.lower():
            return False
    return True
