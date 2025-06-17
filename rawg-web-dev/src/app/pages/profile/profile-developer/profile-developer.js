/* eslint-disable camelcase */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { injectIntl, FormattedMessage, FormattedHTMLMessage } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import { Link } from 'app/components/link';
import { push } from 'react-router-redux';

import paths from 'config/paths';

import currentUserType from 'app/components/current-user/current-user.types';
import user from 'app/components/current-user/current-user.helper';

import throwValidationError from 'tools/throw-validation-error';
import id from 'tools/id';
import checkAuth, { AUTH_FORWARD_DEVELOPER } from 'tools/hocs/check-auth';

import {
  addNotification,
  NOTIF_STATUS_SUCCESS,
  EXPIRES_IMMEDIATELY,
} from 'app/pages/app/components/notifications/notifications.actions';

import { LOCAL_PROFILE_SAVED_ID } from 'app/pages/app/components/notifications/notifications.constants';

import Button from 'app/ui/button';
import Input from 'app/ui/input';
import Error from 'app/ui/error';
import Textarea from 'app/ui/textarea';
import Page from 'app/ui/page';
import Content from 'app/ui/content';

import { save } from './profile-developer.actions';

import './profile-developer.styl';

const { reduxForm, Field, propTypes, SubmissionError } = require('redux-form');

const required = (value) => (value ? undefined : 'Required field');
const submit = (values, dispatch) => {
  if (!values.api_description || !values.api_email) {
    throw new SubmissionError();
  }

  return dispatch(save(values)).catch(throwValidationError);
};

const ProfileDeveloperFormPropertyTypes = {
  ...propTypes,
  currentUser: currentUserType.isRequired,
};

const ProfileDeveloperFormDefaultProperties = {};

const messageProperties = {
  id: 'profile.developer_agreement',
  values: {
    terms: (
      <Link className="page__footer-link" to={paths.apidocs} href={paths.apidocs}>
        <FormattedMessage id="profile.developer_terms" />
      </Link>
    ),
  },
};

@hot
@connect((state) => ({
  profileUser: state.profile.user,
  currentUser: state.currentUser,
}))
@reduxForm({
  form: 'developer-info',
  persistentSubmitErrors: true,
  onSubmitSuccess: (result, dispatch, props) => {
    const {
      currentUser: { slug },
    } = props;

    dispatch(
      addNotification({
        id: LOCAL_PROFILE_SAVED_ID,
        weight: 8,
        authenticated: true,
        expires: EXPIRES_IMMEDIATELY,
        local: true,
        fixed: true,
        status: NOTIF_STATUS_SUCCESS,
        message: (
          <FormattedHTMLMessage
            id="profile.developer_info_success"
            values={{ apikeyLink: paths.profileApiKey(slug) }}
          />
        ),
      }),
    );

    dispatch(push(paths.profileApiKey(slug)));
  },
})
@injectIntl
@checkAuth({
  login: true,
  redirectToLogin: true,
  appendQuery: {
    forward: AUTH_FORWARD_DEVELOPER,
  },
})
export default class ProfileDeveloperForm extends Component {
  static propTypes = ProfileDeveloperFormPropertyTypes;

  static defaultProps = ProfileDeveloperFormDefaultProperties;

  componentDidMount() {
    const {
      dispatch,
      initialize,
      currentUser: { full_name, email, api_description, api_email, api_url },
    } = this.props;

    dispatch(
      initialize({
        api_url,
        full_name,
        api_description,
        api_email: api_email || email,
      }),
    );
  }

  componentDidUpdate(previousProperties) {
    if (this.props.currentUser.id === previousProperties.currentUser.id) {
      return;
    }

    const { dispatch, initialize, currentUser } = this.props;
    const { full_name, email, api_description, api_email, api_url } = currentUser;

    dispatch(
      initialize({
        api_url,
        full_name,
        api_description,
        api_email: api_email || email,
      }),
    );
  }

  renderForm() {
    const { intl, submitting, handleSubmit, error, currentUser } = this.props;

    return (
      <form className="profile-developer" onSubmit={handleSubmit(submit)}>
        <h2 className="profile-developer__title">
          <FormattedMessage
            id={user.hasApiKey(currentUser) ? 'profile.developer_update_title' : 'profile.developer_title'}
          />
        </h2>
        <div className="profile-developer__inputs">
          <Field
            type="text"
            name="full_name"
            placeholder={intl.formatMessage(id('profile.developer_name_placeholer'))}
            component={Input}
          />
          <Field
            type="email"
            name="api_email"
            validate={required}
            placeholder={intl.formatMessage(id('profile.developer_email_placeholer'))}
            component={Input}
          />
        </div>
        <Field
          type="text"
          name="api_url"
          placeholder={intl.formatMessage(id('profile.developer_website_placeholer'))}
          component={Input}
        />
        <Field
          type="text"
          name="api_description"
          validate={required}
          placeholder={intl.formatMessage(id('profile.developer_use_placeholer'))}
          component={Textarea}
        />
        {error && error.map((e) => <Error error={e} kind="form" key={e} />)}

        <Button
          type="submit"
          kind="fill"
          size="medium"
          className="profile-developer__save-button"
          loading={submitting}
          disabled={submitting}
        >
          <FormattedMessage
            id={user.hasApiKey(currentUser) ? 'profile.developer_update_button_save' : 'profile.developer_button_save'}
          />
        </Button>

        {!user.hasApiKey(currentUser) && (
          <div className="profile-developer__policy">
            <FormattedMessage {...messageProperties} />
          </div>
        )}
      </form>
    );
  }

  render() {
    const { intl, profileUser } = this.props;
    const { username } = profileUser;

    return (
      <Page
        helmet={{
          title: intl.formatMessage(
            {
              id: `profile.head_title_/developer`,
            },
            { name: username },
          ),
          image: profileUser.share_image,
          none: profileUser.noindex,
        }}
        withSidebar={false}
        art={{ secondary: true }}
      >
        <Content columns="1-2" position="center" fullSize>
          <div className="profile-developer__content">{this.renderForm()}</div>
        </Content>
      </Page>
    );
  }
}
