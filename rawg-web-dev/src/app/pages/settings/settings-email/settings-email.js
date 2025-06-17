/* eslint-disable camelcase, no-nested-ternary */
/* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/anchor-is-valid */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import checkAuth from 'tools/hocs/check-auth';
import currentUserType from 'app/components/current-user/current-user.types';
import { resendConfirmationEmail } from '../settings.actions';
import SettingsEmailForm from './settings-email-form';

@checkAuth({ login: true })
@connect((state) => ({
  currentUser: state.currentUser,
}))
export default class SettingsEmail extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    currentUser: currentUserType.isRequired,
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      success: false,
      error: false,
    };
  }

  handleResendClick = () => {
    const { dispatch } = this.props;

    dispatch(resendConfirmationEmail())
      .then(() => {
        this.setState({ success: true });
      })
      .catch(() => {
        this.setState({ error: true });
      });
  };

  render() {
    const {
      currentUser: { email_confirmed },
    } = this.props;
    const { success, error } = this.state;

    return (
      <div>
        <SettingsEmailForm />
        {!email_confirmed ? (
          success ? (
            <div className="settings__form-bottom-link">
              <FormattedMessage id="settings.email_resend_email_success" />
            </div>
          ) : error ? (
            <div className="settings__form-bottom-link">
              <FormattedMessage id="settings.email_resend_email_error" />
            </div>
          ) : (
            <div className="settings__form-bottom-link">
              <a onClick={this.handleResendClick}>
                <FormattedMessage id="settings.email_resend_email" />
              </a>
            </div>
          )
        ) : null}
      </div>
    );
  }
}
