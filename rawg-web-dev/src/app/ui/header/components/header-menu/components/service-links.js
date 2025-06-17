import React from 'react';
import { Link } from 'app/components/link';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import '../header-menu.styl';
import paths from 'config/paths';
import currentUserType from 'app/components/current-user/current-user.types';
import { appLocaleType } from 'app/pages/app/app.types';

import APIKeyLink from './apikey-link';

const propTypes = {
  locale: appLocaleType.isRequired,
  currentUser: currentUserType.isRequired,
};

const ServiceLinks = ({ locale, currentUser }) => {
  if (locale === 'ru') {
    return (
      <Link
        key={paths.sitemap('А')}
        to={paths.sitemap('А')}
        rel="nofollow noopener noreferrer"
        className="header-menu-content__settings-link"
      >
        <SimpleIntlMessage id="shared.social_menu_sitemap" />
      </Link>
    );
  }

  return (
    <>
      <APIKeyLink currentUser={currentUser} />
      <Link
        key={paths.sitemap('A')}
        to={paths.sitemap('A')}
        rel="nofollow noopener noreferrer"
        className="header-menu-content__settings-link"
      >
        <SimpleIntlMessage id="shared.social_menu_sitemap" />
      </Link>
    </>
  );
};

ServiceLinks.propTypes = propTypes;

export default ServiceLinks;
