import React, { useCallback, useState, useEffect } from 'react';
import { hot } from 'react-hot-loader/root';
import PropTypes from 'prop-types';
import browserCookies from 'browser-cookies';

import startsWith from 'ramda/src/startsWith';

import paths from 'config/paths';
import { compose } from 'recompose';
import currentUserType from 'app/components/current-user/current-user.types';

import { appLocaleType, appSizeType } from 'app/pages/app/app.types';

// import BannerWelcome, { bannerWelcomeEnabled, hideWelcomeBannerCookie } from '../banner-welcome';
// import BannerYandexZen, { bannerYandexZenEnabled, hideYandexZenBannerCookie } from '../banner-yandex-zen';
// import CookieBanner from '../cookie-banner';

const disabledBannersPaths = [
  paths.welcome,
  paths.login,
  paths.register,
  paths.feedback,
  paths.passwordRecovery,
  paths.passwordReset(),
  paths.confirmEmail(),
  // paths.gameAccounts,
  paths.internalServerError,
  paths.notFoundError,
  paths.privacyPolicy,
  paths.agreement,
  paths.privacy,
  paths.terms,
  paths.embeddedStories,
  paths.profile(''),
  paths.apidocs,
];

const hoc = compose(hot);

const propTypes = {
  appLocale: appLocaleType.isRequired,
  appSize: appSizeType.isRequired,
  firstPage: PropTypes.bool.isRequired,
  currentPath: PropTypes.string.isRequired,
  requestCookies: PropTypes.shape(),
  currentUser: currentUserType.isRequired,
};

const defaultProps = {
  requestCookies: undefined,
};

export const bannersDisabled = (pathname) => disabledBannersPaths.some(startsWith(pathname));

const banners = [
  // {
  //   check: bannerWelcomeEnabled,
  //   block: BannerWelcome,
  //   cookie: hideWelcomeBannerCookie,
  // },
  // {
  //   check: bannerYandexZenEnabled,
  //   block: BannerYandexZen,
  //   cookie: hideYandexZenBannerCookie,
  // },
];

const AppBannersComponent = ({ appLocale, appSize, currentPath, requestCookies, currentUser, firstPage }) => {
  if (currentPath !== '/' && bannersDisabled(currentPath)) {
    return null;
  }

  const checkArgs = { currentUser, currentPath, requestCookies, firstPage, appLocale };
  const getActiveBlock = () => banners.find((block) => block.check(checkArgs));

  const [isEnabled, setEnabled] = useState(false);
  const [activeBlock, setActiveBlock] = useState(getActiveBlock());

  const onHideBanner = useCallback(() => {
    browserCookies.set(activeBlock.cookie, 'true', { expires: 999 });

    setActiveBlock(getActiveBlock());
  }, [activeBlock]);

  useEffect(() => {
    setActiveBlock(getActiveBlock());

    if (!isEnabled) {
      setEnabled(true);
    }
  }, [currentPath]);

  if (activeBlock && isEnabled) {
    return React.createElement(activeBlock.block, { onHideBanner, appSize });
  }

  return null;
};

AppBannersComponent.propTypes = propTypes;
AppBannersComponent.defaultProps = defaultProps;

const AppBanners = hoc(AppBannersComponent);

export default AppBanners;
