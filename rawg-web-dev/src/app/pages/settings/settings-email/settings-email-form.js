import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm, Field } from 'redux-form';
import { injectIntl, FormattedMessage } from 'react-intl';
import { compose } from 'recompose';

import throwValidationError from 'tools/throw-validation-error';

import {
  addNotification,
  NOTIF_STATUS_SUCCESS,
  EXPIRES_IMMEDIATELY,
} from 'app/pages/app/components/notifications/notifications.actions';

import { LOCAL_EMAIL_CHANGED_ID } from 'app/pages/app/components/notifications/notifications.constants';

import Button from 'app/ui/button';
import Input from 'app/ui/input';
import Error from 'app/ui/error';

import currentUserType from 'app/components/current-user/current-user.types';
import intlShape from 'tools/prop-types/intl-shape';

import { changeEmail } from '../settings.actions';

import './settings-email-form.styl';

const hoc = compose(
  reduxForm({
    form: 'settings-email',
    persistentSubmitErrors: true,
    onSubmitSuccess: (result, dispatch /* , props */) => {
      dispatch(
        addNotification({
          id: LOCAL_EMAIL_CHANGED_ID,
          weight: 8,
          local: true,
          fixed: true,
          authenticated: true,
          expires: EXPIRES_IMMEDIATELY,
          message: <FormattedMessage id="settings.email_success" />,
          status: NOTIF_STATUS_SUCCESS,
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
  error: PropTypes.arrayOf(PropTypes.shape()),
  handleSubmit: PropTypes.func.isRequired,
};

const defaultProps = {
  error: undefined,
};

const submit = (values, dispatch) => dispatch(changeEmail(values)).catch(throwValidationError);

const SettingsEmailForm = ({ intl, currentUser, submitting, handleSubmit, error }) => (
  <form className="settings-email-form" onSubmit={handleSubmit(submit)}>
    <Field
      type="email"
      name="new_email"
      placeholder={intl.formatMessage({ id: 'settings.email_new' })}
      component={Input}
      autoComplete="off"
    />
    <Field
      type="email"
      name="verify_email"
      placeholder={intl.formatMessage({ id: 'settings.email_verify' })}
      component={Input}
      autoComplete="off"
    />
    {currentUser.email && (
      <Field
        type="password"
        name="password"
        placeholder={intl.formatMessage({ id: 'settings.email_password' })}
        component={Input}
        autoComplete="off"
      />
    )}
    {error && error.map((e) => <Error error={e} kind="form" key={e} />)}
    <Button type="submit" kind="fill" size="medium" loading={submitting} disabled={submitting}>
      <FormattedMessage id="settings.email_button" />
    </Button>
  </form>
);

SettingsEmailForm.propTypes = componentPropertyTypes;
SettingsEmailForm.defaultProps = defaultProps;

export default hoc(SettingsEmailForm);
