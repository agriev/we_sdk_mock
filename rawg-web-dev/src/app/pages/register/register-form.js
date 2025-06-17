import React from 'react';
import PropTypes from 'prop-types';
import { reduxForm, Field } from 'redux-form';
import { FormattedMessage, injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import cn from 'classnames';

import './register-form.styl';

import throwValidationError from 'tools/throw-validation-error';
import id from 'tools/id';
import intlShape from 'tools/prop-types/intl-shape';

import Button from 'app/ui/button';
import Input from 'app/ui/input';
import Error from 'app/ui/error';
import { location as appLocationType } from 'app/pages/app/app.types';
import { registerFromTokensPage } from 'app/pages/app/app.actions';
import { register } from './register.actions';

const hasProperty = Object.prototype.hasOwnProperty;

const determineContext = (location) => {
  if (hasProperty.call(location.query, 'tokens')) {
    return 'tokens';
  }

  return undefined;
};

const submit = (data, dispatch, { location = {}, redirect = true }) => {
  const context = determineContext(location);

  return dispatch(
    register({
      data,
      context,
      redirect,
      location,
    }),
  ).catch(throwValidationError);
};

const propTypes = {
  submitting: PropTypes.bool.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  dispatch: PropTypes.func.isRequired,
  error: PropTypes.arrayOf(PropTypes.shape()),
  location: appLocationType.isRequired,
  redirect: PropTypes.bool,
  intl: intlShape.isRequired,
};

const defaultProps = {
  error: null,
  redirect: true,
};

@connect()
@reduxForm({
  form: 'register',
})
@injectIntl
class RegisterForm extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(...arguments_) {
    super(...arguments_);

    this.state = {
      passwordHelpShowed: false,
    };
  }

  componentDidMount() {
    if (hasProperty.call(this.props.location.query, 'tokens')) {
      this.props.dispatch(registerFromTokensPage());
    }
  }

  showPasswordHelp = () => {
    this.setState({ passwordHelpShowed: true });
  };

  hidePasswordHelp = () => {
    this.setState({ passwordHelpShowed: false });
  };

  submit = (data, dispatch, { location = {} }) => {
    const { redirect } = this.props;

    return submit(data, dispatch, { location, redirect });
  };

  render() {
    const { submitting, handleSubmit, error, intl } = this.props;
    const { passwordHelpShowed } = this.state;

    return (
      <form className="register-form" method="post" onSubmit={handleSubmit(this.submit)}>
        <Field
          type="email"
          hideNameAttribute
          name="email"
          placeholder={intl.formatMessage(id('register.email_input_placeholer'))}
          component={Input}
        />
        <Field
          type="text"
          hideNameAttribute
          name="username"
          placeholder={intl.formatMessage(id('register.username_input_placeholer'))}
          component={Input}
        />
        <div className="register-form__password">
          <Field
            type="password"
            autoComplete="new-password"
            name="password"
            placeholder={intl.formatMessage(id('register.password_input_placeholer'))}
            component={Input}
            onFocus={this.showPasswordHelp}
            onBlur={this.hidePasswordHelp}
            hideNameAttribute
          />
          {error && error.map((e) => <Error error={e} kind="form" key={e} />)}
          <div
            className={cn('register-form__password-help', {
              'register-form__password-help_active': passwordHelpShowed,
            })}
          >
            {intl.formatMessage({ id: 'register.password_tip' })}
          </div>
        </div>
        <Button type="submit" kind="fill" size="medium" loading={submitting} disabled={submitting}>
          <FormattedMessage id="register.button" />
        </Button>
      </form>
    );
  }
}

export default RegisterForm;
