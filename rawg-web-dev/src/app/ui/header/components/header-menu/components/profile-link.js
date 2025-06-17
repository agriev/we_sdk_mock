import React from 'react';
import { Link } from 'app/components/link';

import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';
import Avatar from 'app/ui/avatar';
import { headerMenuPropTypes } from '../header-menu';

import '../header-menu.styl';

const ProfileLink = ({ currentUser, size }) => (
  <Link className="header-menu-content__user-link" to={paths.profile(currentUser.slug)}>
    <Avatar src={currentUser.avatar} size={appHelper.isDesktopSize({ size }) ? 26 : 56} profile={currentUser} />
  </Link>
);

ProfileLink.propTypes = headerMenuPropTypes;

export default ProfileLink;
