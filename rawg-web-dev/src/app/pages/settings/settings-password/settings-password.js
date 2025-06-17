import React from 'react';

import checkAuth from 'tools/hocs/check-auth';
import SettingsPasswordForm from './settings-password-form';

const SettingsPassword = () => <SettingsPasswordForm />;

export default checkAuth({ login: true })(SettingsPassword);
