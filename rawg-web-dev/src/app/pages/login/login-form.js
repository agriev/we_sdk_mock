import React from 'react';
import { reduxForm, Field, propTypes as formPropertyTypes } from 'redux-form';
import { FormattedMessage, injectIntl } from 'react-intl';
import { compose } from 'recompose';

import id from 'tools/id';

import './login-form.styl';

import throwValidationError from 'tools/throw-validation-error';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import Button from 'app/ui/button';
import Input from 'app/ui/input';
import Error from 'app/ui/error';

import { login } from './login.actions';

const getSubmit = ({ closeAfterSuccess, forward }) => (values, dispatch) =>
  dispatch(login({ ...values }, { forward }))
    .then(() => {
      if (closeAfterSuccess) {
        window.close();
      }
    })
    .catch(throwValidationError);

const hoc = compose(
  reduxForm({
    form: 'login',
    persistentSubmitErrors: true,
  }),
  injectIntl,
);

const componentPropertyTypes = {
  ...formPropertyTypes,
  location: locationShape.isRequired,
  intl: intlShape.isRequired,
};

const defaultProps = {};

const LoginFormComponent = ({ submitting, handleSubmit, error, location, intl }) => {
  const closeAfterSuccess = location.query.closeAfterSuccess === 'true';
  const { forward } = location.query;

  return (
    <form id="login-form" method="post" onSubmit={handleSubmit(getSubmit({ closeAfterSuccess, forward }))}>
      <Field
        type="email"
        name="email"
        placeholder={intl.formatMessage(id('login.email_input_placeholer'))}
        component={Input}
      />
      <Field
        type="password"
        name="password"
        placeholder={intl.formatMessage(id('login.password_input_placeholer'))}
        component={Input}
      />
      {error && error.map((e) => <Error error={e} kind="form" key={e} />)}
      <Button type="submit" kind="fill" size="medium" loading={submitting} disabled={submitting}>
        <FormattedMessage id="login.button" />
      </Button>
    </form>
  );
};

LoginFormComponent.propTypes = componentPropertyTypes;
LoginFormComponent.defaultProps = defaultProps;

const LoginForm = hoc(LoginFormComponent);

export default LoginForm;
