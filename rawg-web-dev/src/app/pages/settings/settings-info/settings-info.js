import React from 'react';

import checkAuth from 'tools/hocs/check-auth';

import SettingsInfoForm from './settings-info-form';
import './settings-info.styl';

const SettingsInfo = () => <SettingsInfoForm />;

export default checkAuth({ login: true })(SettingsInfo);
