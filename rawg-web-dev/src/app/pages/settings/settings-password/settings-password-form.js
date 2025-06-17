import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { Link } from 'app/components/link';
import { reduxForm, Field } from 'redux-form';
import { injectIntl, FormattedMessage, FormattedHTMLMessage } from 'react-intl';

import throwValidationError from 'tools/throw-validation-error';

import {
  addNotification,
  NOTIF_STATUS_SUCCESS,
  EXPIRES_IMMEDIATELY,
} from 'app/pages/app/components/notifications/notifications.actions';

import { LOCAL_PASSWORD_UPDATED_ID } from 'app/pages/app/components/notifications/notifications.constants';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import Button from 'app/ui/button';
import Input from 'app/ui/input';
import Error from 'app/ui/error';
import paths from 'config/paths';

import currentUserType from 'app/components/current-user/current-user.types';
import intlShape from 'tools/prop-types/intl-shape';

import { changePassword } from '../settings.actions';

import './settings-password-form.styl';

const hoc = compose(
  reduxForm({
    form: 'settings-password',
    persistentSubmitErrors: true,
    onSubmitSuccess: (result, dispatch /* , props */) => {
      dispatch(
        addNotification({
          id: LOCAL_PASSWORD_UPDATED_ID,
          weight: 8,
          local: true,
          fixed: true,
          authenticated: true,
          expires: EXPIRES_IMMEDIATELY,
          status: NOTIF_STATUS_SUCCESS,
          message: <FormattedMessage id="settings.password_success" />,
        }),
      );
    },
  }),
  injectIntl,
  connect((state) => ({
    currentUser: state.currentUser,
  })),
);

const componentPropertyTypes = {
  intl: intlShape.isRequired,
  currentUser: currentUserType.isRequired,
  submitting: PropTypes.bool.isRequired,
  submitSucceeded: PropTypes.bool.isRequired,
  error: PropTypes.arrayOf(PropTypes.shape()),
  handleSubmit: PropTypes.func.isRequired,
};

const defaultProps = {
  error: undefined,
};

const submit = (values, dispatch) => dispatch(changePassword(values)).catch(throwValidationError);

const SettingsPasswordForm = ({ intl, currentUser, submitting, handleSubmit, submitSucceeded, error }) => (
  <form className="settings-password-form" onSubmit={handleSubmit(submit)}>
    <Field
      type="password"
      name="new_password"
      placeholder={intl.formatMessage({ id: 'settings.password_new' })}
      component={Input}
      autoComplete="off"
    />
    <Field
      type="password"
      name="verify_password"
      placeholder={intl.formatMessage({ id: 'settings.password_verify' })}
      component={Input}
      autoComplete="off"
    />
    {currentUser.set_password && (
      <Field
        type="password"
        name="old_password"
        placeholder={intl.formatMessage({ id: 'settings.password_old' })}
        component={Input}
        autoComplete="off"
      />
    )}
    {error && error.map((e) => <Error error={e} kind="form" key={e} />)}
    <Button type="submit" kind="fill" size="medium" loading={submitting} disabled={submitting}>
      <SimpleIntlMessage id="settings.password_button" />
    </Button>
    {!submitSucceeded && (
      <div className="settings__form-bottom-link">
        <Link to={paths.passwordRecovery} href={paths.passwordRecovery} rel="nofollow">
          <FormattedHTMLMessage id="settings.password_forgot" />
        </Link>
      </div>
    )}
  </form>
);

SettingsPasswordForm.propTypes = componentPropertyTypes;
SettingsPasswordForm.defaultProps = defaultProps;

export default hoc(SettingsPasswordForm);
