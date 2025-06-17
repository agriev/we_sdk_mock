import React from 'react';

import checkAuth from 'tools/hocs/check-auth';
import GameAccountsShared from 'app/components/game-accounts';

const SettingsGameAccounts = () => <GameAccountsShared />;

export default checkAuth({ login: true })(SettingsGameAccounts);
