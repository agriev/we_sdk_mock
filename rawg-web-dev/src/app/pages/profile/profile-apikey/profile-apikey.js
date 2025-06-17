/* eslint-disable camelcase */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { injectIntl, FormattedMessage, FormattedHTMLMessage } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import { Link } from 'app/components/link';
import SVGInline from 'react-svg-inline';
import cn from 'classnames';
import PropTypes from 'prop-types';

import paths from 'config/paths';

import user from 'app/components/current-user/current-user.helper';
import currentUserType from 'app/components/current-user/current-user.types';

import copyTextToClipboard from 'tools/copy-to-clipboard';
import intlShape from 'tools/prop-types/intl-shape';
import checkAuth, { AUTH_FORWARD_DEVELOPER } from 'tools/hocs/check-auth';

import {
  addNotification,
  NOTIF_STATUS_SUCCESS,
  EXPIRES_IMMEDIATELY,
} from 'app/pages/app/components/notifications/notifications.actions';
import { goToManageSubscription } from 'app/components/api-subscription/api-subscription.actions';

import { LOCAL_PROFILE_SAVED_ID } from 'app/pages/app/components/notifications/notifications.constants';

import Button from 'app/ui/button';
import Confirm from 'app/ui/confirm/confirm';
import Page from 'app/ui/page';
import Content from 'app/ui/content';

import copyIcon from 'assets/icons/copy.svg';

import { refreshApiKey, getRequestsStats } from './profile-apikey.actions';

import './profile-apikey.styl';

const ProfileApiKeyFormPropertyTypes = {
  intl: intlShape.isRequired,
  profileUser: currentUserType,
  params: PropTypes.shape({
    id: PropTypes.string,
  }),
  dispatch: PropTypes.func.isRequired,
  currentUser: currentUserType.isRequired,
};

const ProfileApiKeyFormDefaultProperties = {};

@hot
@connect((state) => ({
  profileUser: state.profile.user,
  currentUser: state.currentUser,
}))
@injectIntl
@checkAuth({
  login: true,
  redirectToLogin: true,
  appendQuery: {
    forward: AUTH_FORWARD_DEVELOPER,
  },
})
export default class ProfileApiKeyForm extends Component {
  static propTypes = ProfileApiKeyFormPropertyTypes;

  static defaultProps = ProfileApiKeyFormDefaultProperties;

  constructor(props) {
    super(props);

    this.state = {
      copied: false,
      requestsLeft: Infinity,
      dateTo: null,
    };
  }

  componentDidMount() {
    this.getRequestsStats();
  }

  getRequestsStats = async () => {
    const { dispatch } = this.props;
    const res = await dispatch(getRequestsStats());
    this.setState({
      requestsLeft: res.count,
      dateTo: new Date(res.date_to).toLocaleDateString(),
    });
  };

  copyApiKey = () => {
    const { dispatch, currentUser } = this.props;
    copyTextToClipboard(currentUser.api_key);

    dispatch(
      addNotification({
        id: LOCAL_PROFILE_SAVED_ID,
        weight: 8,
        authenticated: true,
        expires: EXPIRES_IMMEDIATELY,
        local: true,
        fixed: true,
        status: NOTIF_STATUS_SUCCESS,
        message: <FormattedHTMLMessage id="profile.apikey_copy_success" />,
      }),
    );

    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 150);
  };

  refreshApiKey = async () => {
    const { dispatch } = this.props;
    await dispatch(refreshApiKey());
    dispatch(
      addNotification({
        id: LOCAL_PROFILE_SAVED_ID,
        weight: 8,
        authenticated: true,
        expires: EXPIRES_IMMEDIATELY,
        local: true,
        fixed: true,
        status: NOTIF_STATUS_SUCCESS,
        message: <FormattedHTMLMessage id="profile.apikey_refresh_success" />,
      }),
    );
  };

  goToManageSubscription = () => {
    const { dispatch } = this.props;
    dispatch(goToManageSubscription());
  };

  renderFieldInfo(labelId, value, variant = 'default') {
    return (
      <div className={`profile-apikey__field _${variant}`}>
        <div className="profile-apikey__label">
          <strong>
            <FormattedMessage id={labelId} />
          </strong>
        </div>
        <div className="profile-apikey__field-value">{value}</div>
      </div>
    );
  }

  renderApiKey() {
    const { currentUser } = this.props;
    const { copied } = this.state;

    return (
      <div className="profile-apikey__api-key-field">
        <div
          className={cn('profile-apikey__api-key-copy-subcontainer', {
            copied,
          })}
          onClick={this.copyApiKey}
          role="button"
          tabIndex={0}
        >
          <div className="profile-apikey__api-key-copy">{currentUser.api_key}</div>
          <SVGInline svg={copyIcon} />
        </div>

        <Confirm className="profile-apikey__refresh-button" onConfirm={this.refreshApiKey}>
          <FormattedMessage id="profile.apikey_button_regenerate" />
        </Confirm>
      </div>
    );
  }

  renderContent() {
    const { currentUser } = this.props;
    const { requestsLeft, dateTo } = this.state;
    const isBusinessUser = user.isBusiness(currentUser);

    return (
      <div className="profile-apikey">
        <h2 className="profile-apikey__title">
          <FormattedMessage id="profile.apikey_title" />

          <Link to={paths.profileDeveloper(currentUser.slug)} className="profile-apikey__edit-button">
            <Button type="submit" kind="fill" size="small">
              <FormattedMessage id="profile.apikey_edit_info" />
            </Button>
          </Link>
        </h2>

        {this.renderFieldInfo('profile.developer_plan', currentUser.api_group, 'plan')}
        {this.renderFieldInfo(
          'profile.developer_requests_count',
          requestsLeft === Infinity ? 'loading...' : requestsLeft,
        )}
        {this.renderFieldInfo('profile.developer_requests_refresh_date', dateTo === null ? 'loading...' : dateTo)}
        {isBusinessUser && (
          <Button
            className="profile-apikey__manage-button"
            type="button"
            kind="fill"
            size="small"
            onClick={this.goToManageSubscription}
          >
            Manage subscription
          </Button>
        )}
        {this.renderFieldInfo('profile.developer_name_placeholer', currentUser.full_name)}
        {this.renderFieldInfo('profile.developer_email_placeholer', currentUser.api_email)}
        {this.renderFieldInfo(
          'profile.developer_website_placeholer',
          <Link target="_blank" to={currentUser.api_url}>
            {currentUser.api_url}
          </Link>,
        )}
        {this.renderFieldInfo('profile.developer_use_placeholer', currentUser.api_description)}
        {user.hasApiKey(currentUser) && this.renderFieldInfo('profile.apikey_api_key', this.renderApiKey())}
      </div>
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
              id: `profile.head_title_/apikey`,
            },
            { name: username },
          ),
        }}
        withSidebar={false}
        art={{ secondary: true }}
      >
        <Content columns="1-2" position="center" fullSize>
          <div className="profile-apikey__content">{this.renderContent()}</div>
        </Content>
      </Page>
    );
  }
}
