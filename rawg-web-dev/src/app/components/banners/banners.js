import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';

import get from 'lodash/get';

// import { userHasConnections } from 'app/pages/accounts-import/accounts-import.helpers';

import currentUserType from 'app/components/current-user/current-user.types';
import { hideBanner, getBannerKey } from 'app/components/current-user/current-user.actions';

// import BannerConnectAccounts from 'app/ui/banner-connect-accounts';
// import BannerRateGames from 'app/ui/banner-rate-games';

const blocks = [
  // {
  //   check: ({ currentUser }) => {
  //     return !userHasConnections(currentUser);
  //   },
  //   block: BannerConnectAccounts,
  //   name: 'ConnectAccounts',
  // },
  // {
  //   check: ({ currentUser }) => {
  //     return currentUser.reviews_count === 0 && currentUser.games_count > 0;
  //   },
  //   block: BannerRateGames,
  //   name: 'RateGames',
  // },
];

const hoc = compose(
  hot(module),
  connect((state) => ({
    settings: get(state, 'currentUser.settings'),
    currentUser: state.currentUser,
    profileId: state.profile.user.id,
  })),
);

const componentPropertyTypes = {
  settings: PropTypes.shape(),
  currentUser: currentUserType.isRequired,
  profileId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  dispatch: PropTypes.func.isRequired,
  isProfilePage: PropTypes.bool,
};

const defaultProps = {
  settings: null,
  isProfilePage: false,
};

// const BannersComponent = ({ currentUser, settings, dispatch, isProfilePage, profileId }) => {
//   const isDisabled = (name) => settings && settings[getBannerKey(name)] === true;

//   const firstActiveBlock = blocks.find((block) => {
//     if (isDisabled(block.name)) {
//       return false;
//     }

//     return block.check({ currentUser });
//   });

//   const firstActiveBlockName = get(firstActiveBlock, 'name');
//   const hideBannerCallback = useCallback(() => dispatch(hideBanner(firstActiveBlockName)), [firstActiveBlockName]);

//   if (isProfilePage && profileId !== currentUser.id) {
//     return null;
//   }

//   if (firstActiveBlock) {
//     return React.createElement(firstActiveBlock.block, { hideBanner: hideBannerCallback });
//   }

//   return null;
// };
const BannersComponent = () => null;

BannersComponent.propTypes = componentPropertyTypes;
BannersComponent.defaultProps = defaultProps;

const Banners = hoc(BannersComponent);

export default Banners;
