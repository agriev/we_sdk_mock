import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import prepare from 'tools/hocs/prepare';

import Banners from 'app/components/banners';
import Loading2 from 'app/ui/loading-2';

import ContentStats from './components/content-stats';
import PlatformsStats from './components/platforms-stats';
import YearsStats from './components/years-stats';
import MetaStats from './components/meta-stats';
import CommonDevelopers from './components/common-developers';
import TopReviews from './components/top-reviews';
import RecentlyAddedGames from './components/recently-added-games';
import FavouriteGames from './components/favourite-games';
import Sharing from './components/sharing';
import {
  loadProfileStats,
  loadProfileTopReviews,
  loadProfileTopPersons,
  loadProfileRecentlyGames,
  loadProfileFavouriteGames,
} from '../profile.actions';
import './profile-overview.styl';

@prepare(
  async ({ store, params = {} }) => {
    const { id } = params;

    await Promise.allSettled([
      store.dispatch(loadProfileStats(id)),
      store.dispatch(loadProfileTopReviews(id)),
      store.dispatch(loadProfileTopPersons(id)),
      store.dispatch(loadProfileRecentlyGames({ id })),
      store.dispatch(loadProfileFavouriteGames({ id })),
    ]);
  },
  {
    updateParam: 'id',
    loading: false,
  },
)
@connect((state) => ({
  currentUser: state.currentUser,
  profile: state.profile,
}))
export default class ProfileOverview extends Component {
  static propTypes = {
    profile: PropTypes.shape().isRequired,
    params: PropTypes.shape().isRequired,
  };

  render() {
    const { params, profile } = this.props;
    const { stats } = profile;
    const { loading } = stats;

    return loading ? (
      <div className="profile-overview profile-overview_loading">
        <Loading2 radius={48} stroke={2} className="profile-overview__loading" />
      </div>
    ) : (
      <div className="profile-overview">
        <Banners isProfilePage />
        <PlatformsStats />
        <FavouriteGames params={params} />
        <ContentStats />
        <YearsStats />
        <TopReviews />
        <MetaStats />
        <CommonDevelopers />
        <RecentlyAddedGames />
        {/* <Sharing /> */}
      </div>
    );
  }
}
