import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import SVGInline from 'react-svg-inline';

import CloseButton from 'app/ui/close-button';
import paths from 'config/paths';

import steamIcon from 'assets/icons/social/steam-white.svg';
import xboxIcon from 'assets/icons/platforms-icons/xbox.svg';
import psIcon from 'assets/icons/platforms-icons/playstation.svg';

import './banner-connect-accounts.styl';

const hoc = compose(hot(module));

const BannerConnectAccountsComponent = ({ hideBanner }) => (
  <div className="banner-connect-accounts">
    <div className="banner-connect-accounts__text">
      <FormattedMessage id="banners.start-import-text" />
    </div>
    <div className="banner-connect-accounts__grow-container">
      <Link className="banner-connect-accounts__link" to={paths.settingsGameAccounts}>
        <FormattedMessage id="banners.start-import-btn" />
        <SVGInline svg={steamIcon} width="16px" height="16px" />
        <SVGInline svg={xboxIcon} width="16px" height="16px" />
        <SVGInline svg={psIcon} width="21px" height="16px" />
      </Link>
    </div>
    <CloseButton onClick={hideBanner} className="banner-connect-accounts__close-button" />
  </div>
);

BannerConnectAccountsComponent.propTypes = {
  hideBanner: PropTypes.func.isRequired,
};

const BannerConnectAccounts = hoc(BannerConnectAccountsComponent);

export default BannerConnectAccounts;
