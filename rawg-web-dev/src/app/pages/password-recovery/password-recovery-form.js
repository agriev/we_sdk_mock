import React from 'react';
import { reduxForm, Field, propTypes as formPropertyTypes } from 'redux-form';
import { FormattedMessage, injectIntl } from 'react-intl';
import { compose } from 'recompose';

import id from 'tools/id';

import throwValidationError from 'tools/throw-validation-error';

import intlShape from 'tools/prop-types/intl-shape';

import Button from 'app/ui/button';
import Input from 'app/ui/input';
import Error from 'app/ui/error';
import { passwordRecovery } from './password-recovery.actions';

const submit = (values, dispatch) => dispatch(passwordRecovery(values)).catch(throwValidationError);

const hoc = compose(
  reduxForm({
    form: 'passwordRecovery',
  }),
  injectIntl,
);

const componentPropertyTypes = {
  ...formPropertyTypes,
  intl: intlShape.isRequired,
};

const defaultProps = {};

const PasswordRecoveryFormComponent = ({ submitting, handleSubmit, error, intl }) => {
  return (
    <form method="post" onSubmit={handleSubmit(submit)}>
      <Field
        type="email"
        name="email"
        placeholder={intl.formatMessage(id('login.email_input_placeholer'))}
        component={Input}
      />
      {error && error.map((e) => <Error error={e} kind="form" key={e} />)}
      <Button type="submit" kind="fill" size="medium" loading={submitting} disabled={submitting}>
        <FormattedMessage id="password_recovery.button" />
      </Button>
    </form>
  );
};

PasswordRecoveryFormComponent.propTypes = componentPropertyTypes;
PasswordRecoveryFormComponent.defaultProps = defaultProps;

const PasswordRecoveryForm = hoc(PasswordRecoveryFormComponent);

export default PasswordRecoveryForm;
