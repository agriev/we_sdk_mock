/* eslint-disable no-mixed-operators */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import './recently-added-games.styl';

import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';

import currentUserType from 'app/components/current-user/current-user.types';

import GameCardCompactList from 'app/components/game-card-compact-list';

import ProfileTitle from '../profile-title';

@connect((state) => ({
  currentUser: state.currentUser,
  games: denormalizeGamesArr(state, 'profile.recentlyGames.items'),
  allRatings: state.app.ratings,
}))
export default class RecentlyAddedGames extends Component {
  static propTypes = {
    games: PropTypes.arrayOf(PropTypes.object).isRequired,
    allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
    currentUser: currentUserType.isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  render() {
    const { games, currentUser, dispatch, allRatings } = this.props;

    if (games.length === 0) {
      return null;
    }

    return (
      <div className="profile-recently">
        <ProfileTitle id="profile.overview_recently_games_title" centred />
        <GameCardCompactList
          kind="3-columns-desktop"
          games={games}
          currentUser={currentUser}
          dispatch={dispatch}
          allRatings={allRatings}
        />
      </div>
    );
  }
}
