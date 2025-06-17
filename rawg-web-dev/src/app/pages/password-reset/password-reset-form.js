import React from 'react';
import PropTypes from 'prop-types';
import { reduxForm, Field, propTypes as formsPropertyTypes } from 'redux-form';
import { FormattedMessage, injectIntl } from 'react-intl';
import { compose } from 'recompose';

import throwValidationError from 'tools/throw-validation-error';

import intlShape from 'tools/prop-types/intl-shape';

import Button from 'app/ui/button';
import Input from 'app/ui/input';
import Error from 'app/ui/error';

import { passwordReset } from './password-reset.actions';

const submit = (params, values, dispatch) => dispatch(passwordReset(values, params)).catch(throwValidationError);

const hoc = compose(
  reduxForm({
    form: 'password-reset',
  }),
  injectIntl,
);

const componentPropertyTypes = {
  ...formsPropertyTypes,
  params: PropTypes.shape().isRequired,
  intl: intlShape.isRequired,
};

const defaultProps = {};

const PasswordResetFormComponent = ({ params, submitting, handleSubmit, error, intl }) => (
  <form onSubmit={handleSubmit(submit.bind(null, params))}>
    <Field
      type="password"
      name="new_password1"
      placeholder={intl.formatMessage({ id: 'settings.password_new' })}
      component={Input}
    />
    <Field
      type="password"
      name="new_password2"
      placeholder={intl.formatMessage({ id: 'settings.password_verify' })}
      component={Input}
    />
    {error && error.map((e) => <Error error={e} kind="form" key={e} />)}
    <Button type="submit" kind="fill" size="medium" loading={submitting} disabled={submitting}>
      <FormattedMessage id="password_reset.button" />
    </Button>
  </form>
);

PasswordResetFormComponent.propTypes = componentPropertyTypes;
PasswordResetFormComponent.defaultProps = defaultProps;

const PasswordResetForm = hoc(PasswordResetFormComponent);

export default PasswordResetForm;
