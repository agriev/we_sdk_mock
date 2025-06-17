/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';

import paths from 'config/paths';

import '../header-menu.styl';

const ProfileLinks = () => (
  <>
    <Link className="header-menu-content__settings-link" to={paths.settings}>
      <FormattedMessage id="shared.header_menu_settings" />
    </Link>
    <Link className="header-menu-content__settings-link" to={paths.feedback}>
      <FormattedMessage id="shared.header_menu_feedback" />
    </Link>
  </>
);

export default ProfileLinks;
