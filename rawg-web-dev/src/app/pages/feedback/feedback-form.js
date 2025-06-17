/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm, Field, propTypes } from 'redux-form';
import { FormattedMessage, FormattedHTMLMessage, injectIntl } from 'react-intl';
import { Link } from 'app/components/link';
import SVGInline from 'react-svg-inline';

import checkedIcon from 'assets/icons/checked-15.svg';

import id from 'tools/id';

import Button from 'app/ui/button';
import Input from 'app/ui/input';
import Textarea from 'app/ui/textarea';
import Error from 'app/ui/error';

import currentUserType from 'app/components/current-user/current-user.types';
import intlShape from 'tools/prop-types/intl-shape';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';

import throwValidationError from 'tools/throw-validation-error';

import { sendFeedback } from './feedback.actions';

import './feedback-form.styl';

const submit = (values, dispatch) => dispatch(sendFeedback(values)).catch(throwValidationError);

const feedbackFormPropertyTypes = {
  ...propTypes,
  dispatch: PropTypes.func.isRequired,
  currentUser: currentUserType.isRequired,
  intl: intlShape.isRequired,
};

const feedbackFormDefaultProperties = {};

@reduxForm({
  form: 'feedback',
  persistentSubmitErrors: true,
})
@connect((state) => ({
  currentUser: state.currentUser,
}))
@injectIntl
export default class FeedbackForm extends Component {
  static propTypes = feedbackFormPropertyTypes;

  static defaultProps = feedbackFormDefaultProperties;

  componentDidMount() {
    const { dispatch, initialize, currentUser } = this.props;
    const { full_name = '', username = '', email = '' } = currentUser;

    dispatch(initialize({ name: appHelper.getName({ full_name, username }), email }));
  }

  componentDidUpdate(previousProperties) {
    if (this.props.currentUser.id === previousProperties.currentUser.id) {
      return;
    }

    const { dispatch, initialize } = this.props;
    const { currentUser } = this.props;
    const { full_name = '', username = '', email = '' } = currentUser;

    dispatch(initialize({ name: appHelper.getName({ full_name, username }), email }));
  }

  resetForm = () => {
    this.props.reset();
  };

  render() {
    const { handleSubmit, submitting, submitSucceeded, error, currentUser, intl } = this.props;
    const { username = '' } = currentUser;

    return (
      <form className="feedback-form" onSubmit={handleSubmit(submit)}>
        <h2>
          <FormattedMessage id="feedback.title" />
        </h2>

        <div className="page__block">
          <h3>
            <FormattedHTMLMessage id="feedback.text" />
          </h3>
        </div>

        {!submitSucceeded && [
          <div key="form-item-1" className="feedback-form__label">
            <SimpleIntlMessage id="feedback.form_email_label" />
          </div>,
          <Field
            key="form-item-2"
            type="email"
            name="email"
            placeholder={intl.formatMessage(id('feedback.form_email_placeholder'))}
            component={Input}
          />,
          <div key="form-item-3" className="feedback-form__label">
            <SimpleIntlMessage id="feedback.form_username_label" />
          </div>,
          <Field
            key="form-item-4"
            type="text"
            name="name"
            placeholder={intl.formatMessage(id('feedback.form_username_placeholder'))}
            disabled={Boolean(username)}
            component={Input}
          />,
          <div key="form-item-5" className="feedback-form__label">
            <SimpleIntlMessage id="feedback.form_message_label" />
          </div>,
          <Field
            key="form-item-6"
            name="text"
            placeholder={intl.formatMessage(id('feedback.form_message_placeholder'))}
            component={Textarea}
          />,
          error && error.map((e) => <Error error={e} kind="form" key={e} />),
        ]}

        {submitSucceeded && [
          <SVGInline key="success-item-1" className="feedback-form__check-icon" svg={checkedIcon} />,
          <div key="success-item-2" className="feedback-form__success-text">
            <FormattedMessage id="feedback.success_text" />
          </div>,
        ]}

        <div className="feedback-form__buttons">
          {!submitSucceeded && (
            <Button type="submit" kind="fill" size="medium" loading={submitting}>
              <FormattedMessage id={submitSucceeded ? 'feedback.success_button' : 'feedback.button'} />
            </Button>
          )}
          {submitSucceeded && (
            <Link to={paths.index}>
              <Button kind="fill" size="medium">
                <FormattedMessage id="feedback.success_button" />
              </Button>
            </Link>
          )}
          {!submitSucceeded && (
            <Link to={paths.index} className="feedback-form__buttons__text">
              <FormattedMessage id="shared.editor_popup_cancel" />
            </Link>
          )}
          {submitSucceeded && (
            <div onClick={this.resetForm} role="button" tabIndex={0} className="feedback-form__buttons__text">
              <FormattedMessage id="feedback.another_message" />
            </div>
          )}
        </div>
      </form>
    );
  }
}
