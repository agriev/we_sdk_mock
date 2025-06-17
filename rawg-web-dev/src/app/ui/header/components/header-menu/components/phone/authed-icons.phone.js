import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';

import paths from 'config/paths';
import Dropdown from 'app/ui/dropdown';
import Avatar from 'app/ui/avatar';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import currentUserType from 'app/components/current-user/current-user.types';
import { appLocaleType } from 'app/pages/app/app.types';

import AddContentMenu from '../../../add-content-menu';
import LabeledIcon from '../labeled-icon';
import LabeledIconLink from '../labeled-icon-link';
import Notifications from '../../../notifications';

const propTypes = {
  currentUser: currentUserType.isRequired,
  locale: appLocaleType.isRequired,
  handleLogout: PropTypes.func.isRequired,
};

const PhoneAuthedIcons = ({ currentUser, handleLogout, locale }) => {
  const renderedButton = (
    <LabeledIcon iconClassName="header__add-game-icon" label={<SimpleIntlMessage id="header.add" />} />
  );

  return (
    <>
      <Link
        className="header-menu__labeled-icon"
        to={paths.profile(currentUser.slug)}
        href={paths.profile(currentUser.slug)}
      >
        <Avatar src={currentUser.avatar} profile={currentUser} size={48} />
        <div className="header-menu__labeled-icon__label">
          <SimpleIntlMessage id="header.profile" />
        </div>
      </Link>
      <Dropdown
        renderedButton={renderedButton}
        renderContent={() => <AddContentMenu locale={locale} />}
        containerClassName="header__add-content-menu__dropdown-container"
        kind="menu"
      />
      <div className="header-menu__labeled-icon">
        <div className="header-menu__labeled-icon__icon-area">
          <Notifications />
        </div>
        <Link className="header-menu__labeled-icon" to={paths.notifications}>
          <div className="header-menu__labeled-icon__label">
            <SimpleIntlMessage id="header.notifications" />
          </div>
        </Link>
      </div>
      <LabeledIconLink path={paths.settings} intlId="header.settings" iconClassName="header__settings-mobile-icon" />
      <LabeledIconLink path={paths.feedback} intlId="header.feedback" iconClassName="header__feedback-mobile-icon" />
      <div role="link" tabIndex="-1" onClick={handleLogout}>
        <LabeledIcon iconClassName="header__log-out-mobile-icon" label={<SimpleIntlMessage id="header.log_out" />} />
      </div>
    </>
  );
};

PhoneAuthedIcons.propTypes = propTypes;

export default PhoneAuthedIcons;
