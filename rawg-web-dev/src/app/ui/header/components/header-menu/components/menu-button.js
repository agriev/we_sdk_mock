import React from 'react';
import SVGInline from 'react-svg-inline';

import appHelper from 'app/pages/app/app.helper';
import DottedLabel from 'app/ui/header/components/browse-menu/components/dotted-label';
import Avatar from 'app/ui/avatar';
import menuIcon from 'assets/icons/menu.svg';

import '../header-menu.styl';

import { appSizeType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';

const propTypes = {
  size: appSizeType.isRequired,
  currentUser: currentUserType.isRequired,
};

const MenuButton = ({ size, currentUser }) =>
  appHelper.isDesktopSize({ size }) ? (
    <div className="header-menu__dotted">
      <DottedLabel label="" />
    </div>
  ) : (
    <>
      {currentUser.id && <Avatar src={currentUser.avatar} profile={currentUser} />}
      <SVGInline svg={menuIcon} className="header-menu__icon" />
    </>
  );

MenuButton.propTypes = propTypes;

export default MenuButton;
