import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';

import currentUserType from 'app/components/current-user/current-user.types';
import { appSizeType, appLocaleType } from 'app/pages/app/app.types';

import paths from 'config/paths';

import Dropdown from 'app/ui/dropdown';
import MyLibraryMenu from '../my-library-menu';
import BrowseMenuPhone from '../browse-menu/browse-menu.phone';
import GamesMenu from '../games-menu';
import PhoneGuestIcons from './components/phone/guest-icons.phone';
import PhoneAuthedIcons from './components/phone/authed-icons.phone';
import APIKeyLink from './components/apikey-link';

import AddContentMenu from '../add-content-menu';

const propTypes = {
  currentUser: currentUserType.isRequired,
  size: appSizeType.isRequired,
  locale: appLocaleType.isRequired,
  handleLogout: PropTypes.func.isRequired,
  handleClose: PropTypes.func.isRequired,
};

const PhoneHeaderMenu = ({ size, currentUser, handleLogout, handleClose, locale }) => (
  <>
    <div className="header-menu-phone">
      <div className="header-menu-phone__games">
        {currentUser.id && <MyLibraryMenu />}
        <GamesMenu size={size} currentUserId={currentUser.id} />
      </div>

      {/* {currentUser.id ? (
      <PhoneAuthedIcons locale={locale} currentUser={currentUser} handleLogout={handleLogout} />
    ) : (
      <PhoneGuestIcons />
    )} */}

      <nav className="header-menu-phone__icons">
        <div className="header-menu-phone__close-icon" role="button" tabIndex="0" onClick={handleClose} />
        {!currentUser.id && <PhoneGuestIcons />}
      </nav>

      <div className={currentUser.id ? 'header-menu-phone__browse' : 'header-menu-phone__browse_guest'}>
        <BrowseMenuPhone />
      </div>

      <div className="my-library-menu" style={{ marginBottom: 0 }}>
        {currentUser.id && (
          <>
            <Dropdown
              renderedButton={
                <span className="header-menu-content__link header-dropdown-content__games-menu-title">Добавить</span>
              }
              renderContent={() => <AddContentMenu locale={locale} />}
              containerClassName="header__add-content-menu__dropdown-container"
              kind="menu"
            />

            <Link className="header-menu-content__link header-dropdown-content__games-menu-title" to="/notifications">
              Уведомления
            </Link>
          </>
        )}

        <Link className="header-menu-content__link header-dropdown-content__games-menu-title" to="/feedback">
          Обратная связь
        </Link>
      </div>

      {/* {locale !== 'ru' && (
        <>
          <div className="header-menu-content__link-container">
            <Link to={paths.apidocs} className="header-menu-content__link header-dropdown-content__games-menu-title">
              <FormattedMessage id="shared.social_menu_apidocs" />
            </Link>
          </div>
          <div className="header-menu-content__link-container">
            <APIKeyLink isMobile currentUser={currentUser} />
          </div>
        </>
      )} */}
      <div className="header-menu-content__link-container">
        <Link
          to={paths.sitemap(locale === 'ru' ? 'А' : 'A')}
          className="header-menu-content__link header-dropdown-content__games-menu-title"
        >
          <FormattedMessage id="shared.social_menu_sitemap" />
        </Link>
      </div>
    </div>
  </>
);

PhoneHeaderMenu.propTypes = propTypes;

export default PhoneHeaderMenu;
