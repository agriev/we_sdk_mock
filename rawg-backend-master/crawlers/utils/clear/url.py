class URL:
    @staticmethod
    def ios(url):
        return url.replace('itunes.apple.com', 'apps.apple.com')


def clear_url(url, store):
    try:
        return getattr(URL, store)(url)
    except AttributeError:
        return url
