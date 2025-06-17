import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';
import { compose } from 'recompose';

import paths from 'config/paths';
import appHelper from 'app/pages/app/app.helper';

import MaybeRateGames from 'app/ui/header/components/maybe-rate-games';

import { appSizeType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';
import ProfileIframeLink from 'app/pages/profile/profile-iframe-link/profile-iframe-link';

import './my-library-menu.styl';

const showRateInMenu = (currentUser) =>
  currentUser.id && currentUser.games_count > 0 && currentUser.rated_games_percent < 100;

const hoc = compose(
  connect((state) => ({
    size: state.app.size,
    currentUser: state.currentUser,
  })),
);

const componentPropertyTypes = {
  className: PropTypes.string,
  currentUser: currentUserType.isRequired,
  size: appSizeType.isRequired,
};

const defaultProps = {
  className: '',
};

const MyLibraryMenuComponent = ({ className, currentUser, size }) => (
  <nav
    className={[
      'my-library-menu',
      'header-dropdown-menu-content',
      'header-dropdown-menu-content__links',
      className,
    ].join(' ')}
  >
    <Link
      className="header-menu-content__link header-dropdown-content__my-library-title"
      to={paths.profileGames(currentUser.slug)}
    >
      <FormattedMessage id="shared.header_my_library" />
    </Link>
    {/* <Link className="header-menu-content__link" to={paths.profile(currentUser.slug)}>
      <FormattedMessage id="profile.overview" />
    </Link> */}
    <Link className="header-menu-content__link" to={paths.settings}>
      <FormattedMessage id="profile.profile_settings" />
    </Link>
    <ProfileIframeLink className="header-menu-content__link">
      <FormattedMessage id="profile.account_settings" />
    </ProfileIframeLink>

    {!appHelper.isPhoneSize({ size }) && (
      <Link to="/feedback" className="header-menu-content__link">
        Обратная связь
      </Link>
    )}

    {/* <Link className="header-menu-content__link" to={paths.profileGames(currentUser.slug)}>
      <FormattedMessage id="shared.header_my_games" />
    </Link> */}
    {/* {appHelper.isPhoneSize({ size }) && <MaybeRateGames bordered />}
    <Link className="header-menu-content__link" to={paths.profileGamesToPlay(currentUser.slug)}>
      <FormattedMessage id="shared.header_wishlist" />
    </Link> */}
    {/* <Link className="header-menu-content__link" to={paths.profileReviews(currentUser.slug)}>
      <FormattedMessage id="profile.reviews" />
    </Link>
    <Link className="header-menu-content__link" to={paths.profileCollections(currentUser.slug)}>
      <FormattedMessage id="profile.collections" />
    </Link> */}
    {/* {showRateInMenu(currentUser) && appHelper.isDesktopSize({ size }) && <MaybeRateGames bordered />} */}
  </nav>
);

MyLibraryMenuComponent.propTypes = componentPropertyTypes;
MyLibraryMenuComponent.defaultProps = defaultProps;

const MyLibraryMenu = hoc(MyLibraryMenuComponent);

export default MyLibraryMenu;
