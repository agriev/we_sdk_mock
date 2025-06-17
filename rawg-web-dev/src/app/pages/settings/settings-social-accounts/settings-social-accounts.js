import React from 'react';

import checkAuth from 'tools/hocs/check-auth';
import SocialAccountsConnectBlock from 'app/components/social-accounts/social-accounts-connect-block';

const SettingsSocialAccounts = () => <SocialAccountsConnectBlock />;

export default checkAuth({ login: true })(SettingsSocialAccounts);
