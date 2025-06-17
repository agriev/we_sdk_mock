from rest_framework.exceptions import PermissionDenied

AUTH_SCHEME = 'signature'


def auth_header_signature(request):
    auth_header = request.headers.get('Authorization', '').split()
    if len(auth_header) != 2 or auth_header[0].lower() != AUTH_SCHEME:
        raise PermissionDenied()
    return auth_header[1]
