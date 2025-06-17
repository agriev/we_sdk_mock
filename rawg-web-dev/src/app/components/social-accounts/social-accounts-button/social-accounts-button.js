/* eslint-disable no-restricted-globals, no-mixed-operators */
/* global screen */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';

import noop from 'lodash/noop';

import { appLocaleType } from 'app/pages/app/app.types';

import { disconnectSocialAccount } from 'app/components/current-user/current-user.actions';
import socialAccountsHelper from '../social-accounts.helper';

export const socialAccountButtonPropTypes = {
  locale: appLocaleType.isRequired,

  className: PropTypes.string,
  provider: PropTypes.oneOf(['facebook', 'twitter', 'steam', 'vk']).isRequired,
  disconnect: PropTypes.bool,
  dispatch: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]).isRequired,
};

const componentDefaultProperties = {
  className: '',
  disconnect: false,
  onClick: noop,
};

@connect((state) => ({
  locale: state.app.locale,
}))
export default class SocialAccountsButton extends Component {
  static propTypes = socialAccountButtonPropTypes;

  static defaultProps = componentDefaultProperties;

  getWindowSize() {
    const { provider } = this.props;

    switch (provider) {
      case 'facebook':
        return {
          width: 700,
          height: 400,
        };

      case 'twitter':
      case 'steam':
      case 'vk':
        return {
          width: 800,
          height: 400,
        };

      default:
        return undefined;
    }
  }

  getClassName() {
    const { className } = this.props;

    return classnames({
      [className]: className,
    });
  }

  handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const { dispatch, provider, locale, disconnect } = this.props;

    if (disconnect) {
      dispatch(disconnectSocialAccount(provider));
      return;
    }

    this.props.onClick({ provider });

    const { width, height } = this.getWindowSize();
    const left = screen.width / 2 - width / 2;
    const top = screen.height / 2 - height / 2;

    window.open(
      socialAccountsHelper.getProviderAddress(provider, locale),
      '',
      `width=${width},height=${height},top=${top},left=${left}`,
    );
  };

  render() {
    return (
      <div className={this.getClassName()} onClick={this.handleClick} role="button" tabIndex={0}>
        {this.props.children}
      </div>
    );
  }
}
