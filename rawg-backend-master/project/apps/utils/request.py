from sentry_sdk.integrations.wsgi import get_client_ip as sentry_get_client_ip


def get_client_ip(request):
    ip = sentry_get_client_ip(request.META)
    if ip and len(ip) > 15:
        # ipv6
        return None
    return ip


def get_user_agent(request):
    return (request.META.get('HTTP_USER_AGENT') or '')[0:200]
