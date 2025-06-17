import React from 'react';
import { Link } from 'app/components/link';
import PropTypes from 'prop-types';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import '../header-menu.styl';
import currentUserType from 'app/components/current-user/current-user.types';
import user from 'app/components/current-user/current-user.helper';

const APIKeyLinkPropTypes = {
  isMobile: PropTypes.bool,
  currentUser: currentUserType.isRequired,
};

const APIKeyLink = ({ currentUser, isMobile }) => {
  const url = user.getDeveloperURL(currentUser);

  return (
    <Link
      key={url}
      to={url}
      rel="nofollow noopener noreferrer"
      className={
        isMobile
          ? 'header-menu-content__link header-dropdown-content__games-menu-title'
          : 'header-menu-content__settings-link'
      }
    >
      <SimpleIntlMessage id="shared.social_menu_apikey" />
    </Link>
  );
};

APIKeyLink.propTypes = APIKeyLinkPropTypes;

export default APIKeyLink;
