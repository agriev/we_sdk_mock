/* global FB */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import SVGInline from 'react-svg-inline';
import cn from 'classnames';
import { hot } from 'react-hot-loader/root';

import get from 'lodash/get';
import has from 'lodash/has';

import './social-accounts-auth-block.styl';

import fetch from 'tools/fetch';
import getFetchState, { fetchStateType } from 'tools/get-fetch-state';

import appHelper from 'app/pages/app/app.helper';
import { authSuccess } from 'app/pages/app/app.actions';

import facebookIcon from 'assets/icons/social/auth-icon-facebook.svg';
import twitterIcon from 'assets/icons/social/auth-icon-twitter.svg';
import steamIcon from 'assets/icons/social/auth-icon-steam.svg';
import vkIcon from 'assets/icons/social/auth-icon-vk.svg';

import { appSizeType, appLocaleType } from 'app/pages/app/app.types';
import locationShape from 'tools/prop-types/location-shape';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import SocialAccountsButton from '../social-accounts-button';

@hot
@connect((state) => ({
  size: state.app.size,
  locale: state.app.locale,
  fetchState: getFetchState(state),
}))
class SocialAccountsAuthBlock extends React.Component {
  static propTypes = {
    location: locationShape.isRequired,
    fetchState: fetchStateType.isRequired,
    dispatch: PropTypes.func.isRequired,
    context: PropTypes.string.isRequired,
    size: appSizeType.isRequired,
    locale: appLocaleType.isRequired,
    active: PropTypes.bool,
  };

  static defaultProps = {
    active: true,
  };

  fbInited = false;

  constructor(properties, context) {
    super(properties, context);

    this.state = {
      showAdvFacebookBtn: false,
      enableVk: false,
    };
  }

  componentDidMount() {
    const { location, locale } = this.props;

    window.onFBLogin = this.onFBLogin;

    // if (this.props.active) {
    //   this.initFb();
    // }

    const enableVk = has(location.query, 'vkLogin') || locale === 'ru';

    if (enableVk) {
      this.setState({ enableVk: true });
    }
  }

  componentDidUpdate(previousProperties) {
    if (!previousProperties.active && this.props.active) {
      this.initFb();
    }
  }

  initFb = () => {
    if (this.fbInited) {
      return;
    }

    this.fbInited = true;

    if (typeof FB === 'undefined' || typeof get(FB, 'XFBML') === 'undefined') {
      setTimeout(this.initFb, 100);
    } else {
      try {
        FB.XFBML.parse();
        FB.Event.subscribe('xfbml.render', () => {
          this.setState({ showAdvFacebookBtn: true });
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Unable to init facebook login btn :(', error);
      }
    }
  };

  onFBLogin = async ({ authResponse } = {}) => {
    if (!authResponse) {
      return;
    }

    const { context, fetchState: state } = this.props;
    const { accessToken } = authResponse;

    const res = await fetch('/api/auth/facebook', {
      method: 'post',
      state,
      data: {
        access_token: accessToken,
      },
    });

    this.props.dispatch(authSuccess({ res, context }));
  };

  render() {
    const { size, locale } = this.props;
    const { showAdvFacebookBtn, enableVk } = this.state;

    return (
      <div className="social-accounts-auth-block">
        {enableVk && (
          <SocialAccountsButton
            className="social-accounts-auth-block__link social-accounts-auth-block__link_vk"
            provider="vk"
          >
            <SVGInline svg={vkIcon} className="social-accounts-auth-block__icon" width="24px" height="24px" />
            <span className="social-accounts-auth-block__text">
              <SimpleIntlMessage id="login.continue_vk" />
            </span>
          </SocialAccountsButton>
        )}

        <div
          className={cn('fb-login-button social-accounts-auth-block__link', {
            hidden: !showAdvFacebookBtn,
          })}
          data-width={appHelper.isDesktopSize({ size }) ? '304px' : '100%'}
          data-size="large"
          data-button-type="continue_with"
          data-auto-logout-link="false"
          data-use-continue-as="true"
          data-onlogin="onFBLogin"
        />

        {/* <SocialAccountsButton
          className={cn('social-accounts-auth-block__link social-accounts-auth-block__link_facebook', {
            hidden: showAdvFacebookBtn,
          })}
          provider="facebook"
        >
          <SVGInline svg={facebookIcon} className="social-accounts-auth-block__icon" width="24px" height="24px" />
          <span className="social-accounts-auth-block__text">
            <SimpleIntlMessage id="login.continue_facebook" />
          </span>
        </SocialAccountsButton> */}

        {locale === 'en' && (
          <SocialAccountsButton
            className="social-accounts-auth-block__link social-accounts-auth-block__link_twitter"
            provider="twitter"
          >
            <SVGInline svg={twitterIcon} className="social-accounts-auth-block__icon" width="24px" height="24px" />
            <span className="social-accounts-auth-block__text">
              <SimpleIntlMessage id="login.continue_twitter" />
            </span>
          </SocialAccountsButton>
        )}
        {/* <SocialAccountsButton
          className="social-accounts-auth-block__link social-accounts-auth-block__link_steam"
          provider="steam"
        >
          <SVGInline svg={steamIcon} className="social-accounts-auth-block__icon" width="24px" height="24px" />
          <span className="social-accounts-auth-block__text">
            <SimpleIntlMessage id="login.continue_steam" />
          </span>
        </SocialAccountsButton> */}
      </div>
    );
  }
}

export default SocialAccountsAuthBlock;
