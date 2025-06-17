import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import currentUserType from 'app/components/current-user/current-user.types';
import GuestSessionLinks from './guest-session-links';

import '../header-menu.styl';

const propTypes = {
  currentUser: currentUserType.isRequired,
  handleLogout: PropTypes.func.isRequired,
};

const SessionActionsLinks = ({ currentUser, handleLogout }) =>
  currentUser.id ? (
    <div className="header-menu-content__bottom" onClick={handleLogout} role="link" tabIndex={0}>
      <FormattedMessage id="shared.header_menu_log_out" />
    </div>
  ) : (
    <GuestSessionLinks className="header-menu-content__link" />
  );

SessionActionsLinks.propTypes = propTypes;

export default SessionActionsLinks;
