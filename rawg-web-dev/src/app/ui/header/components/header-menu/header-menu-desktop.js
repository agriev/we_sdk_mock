import React from 'react';
import PropTypes from 'prop-types';

import currentUserType from 'app/components/current-user/current-user.types';

import { appLocaleType } from 'app/pages/app/app.types';

import ProfileLinks from './components/profile-links';
import SessionActionsLinks from './components/session-actions-links';
import SocialsLinks from './components/socials-links';
import ServiceLinks from './components/service-links';

const propTypes = {
  currentUser: currentUserType.isRequired,
  locale: appLocaleType.isRequired,
  handleLogout: PropTypes.func.isRequired,
};

const DesktopHeaderMenu = ({ currentUser, handleLogout, locale }) => (
  <>
    <div className="header-menu__content-area">
      {currentUser.id && <ProfileLinks currentUser={currentUser} className="header-menu-content__links" />}
      <SocialsLinks locale={locale} />
      <ServiceLinks locale={locale} currentUser={currentUser} />
    </div>
    {currentUser.id && (
      <div>
        <SessionActionsLinks currentUser={currentUser} handleLogout={handleLogout} />
      </div>
    )}
  </>
);

DesktopHeaderMenu.propTypes = propTypes;

export default DesktopHeaderMenu;
