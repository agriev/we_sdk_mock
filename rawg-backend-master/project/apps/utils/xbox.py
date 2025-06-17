import logging

from xbox.webapi.authentication.manager import AuthenticationManager as DefaultAuthenticationManager
from xbox.webapi.authentication.token import (
    AccessToken, DeviceToken, RefreshToken, TitleToken, Token, UserToken, XSTSToken,
)
from xbox.webapi.common.userinfo import XboxLiveUserInfo

log = logging.getLogger('authentication')


class AuthenticationManager(DefaultAuthenticationManager):
    def save_tokens(self):
        json_file = dict(tokens=list(), userinfo=None)
        tokens = [self.access_token, self.refresh_token, self.user_token,
                  self.xsts_token, self.title_token, self.device_token]
        for token in tokens:
            if not token:
                continue
            json_file['tokens'].append(token.to_dict())
        if self.userinfo:
            json_file['userinfo'] = self.userinfo.to_dict()
        return json_file

    def load_tokens(self, json_file):
        file_tokens = json_file.get('tokens')
        for token in file_tokens:
            t = Token.from_dict(token)
            log.info('Loaded token %s from file' % type(t))
            if isinstance(t, AccessToken):
                self.access_token = t
            elif isinstance(t, RefreshToken):
                self.refresh_token = t
            elif isinstance(t, UserToken):
                self.user_token = t
            elif isinstance(t, DeviceToken):
                self.device_token = t
            elif isinstance(t, TitleToken):
                self.title_token = t
            elif isinstance(t, XSTSToken):
                self.xsts_token = t
        file_userinfo = json_file.get('userinfo')
        if not self.userinfo and file_userinfo:
            self.userinfo = XboxLiveUserInfo.from_dict(file_userinfo)
