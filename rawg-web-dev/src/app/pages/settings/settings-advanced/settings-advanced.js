/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import checkAuth from 'tools/hocs/check-auth';
import Checkbox from 'app/ui/checkbox';
import currentUserType from 'app/components/current-user/current-user.types';

import { changeInfo } from '../settings.actions';

import './settings-advanced.styl';

@checkAuth({ login: true })
@connect((state) => ({
  currentUser: state.currentUser,
}))
export default class SettingsAdvanced extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    currentUser: currentUserType.isRequired,
  };

  handleChange = (name, checked) => {
    const { dispatch } = this.props;

    dispatch(changeInfo({ [name]: checked }));
  };

  render() {
    const { currentUser } = this.props;
    const { select_platform } = currentUser;

    return (
      <div className="settings-advanced">
        <Checkbox
          checked={select_platform}
          label={<FormattedMessage id="settings.select_platform" />}
          onChange={(checked) => this.handleChange('select_platform', checked)}
        />
      </div>
    );
  }
}
