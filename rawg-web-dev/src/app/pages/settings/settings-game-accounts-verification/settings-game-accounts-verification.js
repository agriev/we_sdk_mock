import React from 'react';

import checkAuth from 'tools/hocs/check-auth';
import GameAccountsVerificationShared from 'app/components/game-accounts-verification';

const SettingsGameAccountsVerification = () => <GameAccountsVerificationShared />;

export default checkAuth({ login: true })(SettingsGameAccountsVerification);
