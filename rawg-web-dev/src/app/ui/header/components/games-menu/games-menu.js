import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';
import cn from 'classnames';

import './games-menu.styl';

import paths from 'config/paths';

import appHelper from 'app/pages/app/app.helper';
import { appSizeType } from 'app/pages/app/app.types';

import RateTopGamesBadge from 'app/ui/header/components/rate-top-games-badge/rate-top-games-badge';
import { currentUserIdType } from 'app/components/current-user/current-user.types';

const componentPropertyTypes = {
  className: PropTypes.string,
  size: appSizeType.isRequired,
  rateGamesVisible: PropTypes.bool,
  currentUserId: currentUserIdType.isRequired,
};

const defaultProps = {
  className: '',
  rateGamesVisible: true,
};

const GamesMenu = ({ className, size, rateGamesVisible, currentUserId }) => (
  <nav className={cn('games-menu', 'header-dropdown-menu-content', 'header-dropdown-menu-content__links', className)}>
    <Link to={paths.index} className="header-menu-content__link header-dropdown-content__games-menu-title">
      <FormattedMessage id="shared.home" />
    </Link>
    {/* {appHelper.isPhoneSize(size) && !currentUserId && (
      <RateTopGamesBadge bordered forceShow path={paths.rateTopGames} />
    )}
    {appHelper.isDesktopSize(size) && rateGamesVisible && (
      <RateTopGamesBadge bordered forceShow path={paths.rateTopGames} />
    )} */}
    <Link to={paths.reviews} className="header-menu-content__link header-dropdown-content__games-menu-title">
      <FormattedMessage id="reviews.title" />
    </Link>
  </nav>
);

GamesMenu.propTypes = componentPropertyTypes;
GamesMenu.defaultProps = defaultProps;

export default GamesMenu;
