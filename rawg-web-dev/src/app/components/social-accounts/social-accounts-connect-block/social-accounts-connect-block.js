import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import SVGInline from 'react-svg-inline';

import facebookIcon from 'assets/icons/social/facebook.svg';
import twitterIcon from 'assets/icons/social/twitter.svg';
import steamIcon from 'assets/icons/social/steam.svg';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import Error from 'app/ui/error';

import './social-accounts-connect-block.styl';

import { appLocaleType } from 'app/pages/app/app.types';
import { connections as connectionsUserType } from 'app/components/current-user/current-user.types';

import SocialAccountsButton from '../social-accounts-button';

@connect((state) => ({
  authProviderError: state.app.authProviderError,
  locale: state.app.locale,
  connections: state.currentUser.connections,
}))
export default class SocialAccountsConnectBlock extends Component {
  static propTypes = {
    authProviderError: PropTypes.string,
    locale: appLocaleType.isRequired,
    connections: connectionsUserType.isRequired,
  };

  static defaultProps = {
    authProviderError: undefined,
  };

  isConnected = (provider) => this.props.connections.includes(provider);

  renderText(provider) {
    return this.isConnected(provider) ? (
      <span className="social-accounts-connect-text social-accounts-connect-text_disconnect">
        <SimpleIntlMessage id="settings.disconnect" />
      </span>
    ) : (
      <span className="social-accounts-connect-text">
        <SimpleIntlMessage id="settings.connect" />
      </span>
    );
  }

  render() {
    const { authProviderError, locale } = this.props;

    return (
      <div className="social-accounts-connect-block">
        <SocialAccountsButton
          className="social-accounts-connect social-accounts-connect_facebook"
          provider="facebook"
          disconnect={this.isConnected('facebook')}
        >
          {this.renderText('facebook')}
          <SVGInline svg={facebookIcon} className="social-accounts-connect-icon" width="10px" height="20px" />
        </SocialAccountsButton>

        {locale === 'en' && (
          <SocialAccountsButton
            className="social-accounts-connect social-accounts-connect_twitter"
            provider="twitter"
            disconnect={this.isConnected('twitter')}
          >
            {this.renderText('twitter')}
            <SVGInline svg={twitterIcon} className="social-accounts-connect-icon" width="24px" height="20px" />
          </SocialAccountsButton>
        )}

        <SocialAccountsButton
          className="social-accounts-connect social-accounts-connect_steam"
          provider="steam"
          disconnect={this.isConnected('steam')}
        >
          {this.renderText('steam')}
          <SVGInline svg={steamIcon} className="social-accounts-connect-con" width="20px" height="20px" />
        </SocialAccountsButton>

        {authProviderError && <Error error={authProviderError} kind="form" />}
      </div>
    );
  }
}
