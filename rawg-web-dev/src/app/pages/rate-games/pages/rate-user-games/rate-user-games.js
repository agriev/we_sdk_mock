/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import findIndex from 'lodash/findIndex';
import isFinite from 'lodash/isFinite';

import prepare from 'tools/hocs/prepare';
import checkAuth from 'tools/hocs/check-auth';
import appHelper from 'app/pages/app/app.helper';
import { updateRatedGamesPercent } from 'app/components/current-user/current-user.actions';
import { createReview } from 'app/components/review-form/review-form.actions';
import { loadUnratedGames, unloadRatedGames, removeRatedGame } from 'app/pages/profile/profile.actions';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import CloseButton from 'app/ui/close-button';
import RateGamesList from 'app/components/rate-games-list/rate-games-list';

import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import { removeNotificationsById } from 'app/pages/app/components/notifications/notifications.actions';
import { LOCAL_RATEGAMES_WELCOME } from 'app/pages/app/components/notifications/notifications.constants';

import RateHeader from '../../components/rate-header';
import RatePercent from '../../components/rate-percent';
import RateNavInfo from '../../components/rate-nav-info';

import './rate-user-games.styl';

const componentPropertyTypes = {
  intl: intlShape.isRequired,
  size: PropTypes.string.isRequired,
  games: PropTypes.shape({
    count: PropTypes.number,
    total_games: PropTypes.number,
    results: PropTypes.array,
    next: PropTypes.number,
    rated: PropTypes.number,
  }).isRequired,
  dispatch: PropTypes.func.isRequired,
  location: locationShape.isRequired,
};

@prepare()
@checkAuth({
  login: true,
  redirectToLogin: true,
  helmet: {
    title: 'profile.rate_games_title',
    description: 'profile.rate_games_description',
  },
})
@connect((state) => ({
  size: state.app.size,
  games: state.profile.unratedGames,
}))
@injectIntl
export default class RateYourGames extends Component {
  static propTypes = componentPropertyTypes;

  componentDidMount() {
    const { dispatch } = this.props;

    dispatch(loadUnratedGames());

    dispatch(removeNotificationsById(LOCAL_RATEGAMES_WELCOME));
  }

  percentUpdate = () => {
    const { games, dispatch } = this.props;
    const { count, total_games: totalGames } = games;

    dispatch(updateRatedGamesPercent(Math.floor(100 - ((count - 1) / totalGames) * 100)));
  };

  changeRating = async ({ rating, game }) => {
    const { dispatch } = this.props;
    const { id, slug } = game;

    await dispatch(
      createReview({
        id,
        slug,
        rating,
        redirect: false,
        isBack: false,
      }),
    );
  };

  removeRatedGame = (game) => {
    const {
      dispatch,
      games: { results },
    } = this.props;
    const index = findIndex(results, game);

    dispatch(removeRatedGame(index));
  };

  loadGames = () => {
    const { dispatch, games } = this.props;
    const { next, rated } = games;
    const page = isFinite(next) ? next : 0;
    const offset = isFinite(next) ? rated : 0;

    return dispatch(loadUnratedGames({ page, offset }));
  };

  unloadRatedGames = async (gamesCount) => {
    const { dispatch } = this.props;

    await dispatch(unloadRatedGames(gamesCount));
  };

  render() {
    const { intl, games, size } = this.props;
    const { results, count, total_games: totalGames } = games;

    const percent = Math.floor(100 - (count / totalGames) * 100);

    return (
      <Page
        helmet={{
          title: intl.formatMessage({ id: 'profile.rate_games_title' }),
          description: intl.formatMessage({ id: 'profile.rate_games_description' }),
          noindex: true,
          canonical: '/signup?from=rateyourgames',
        }}
        art={{
          image: {},
          height: '500px',
          colored: true,
        }}
        header={{ display: false }}
        className="rate-user-games"
      >
        <Content columns="1" fullScreen={appHelper.isDesktopSize({ size })}>
          <CloseButton className="rate-user-games__close-button" />
          <RateHeader header="rate_games_header" size={size} percent={percent} />
          <RateGamesList
            location={this.props.location}
            games={games}
            percentUpdate={this.percentUpdate}
            loadGames={this.loadGames}
            unloadRatedGames={this.unloadRatedGames}
            changeRating={this.changeRating}
            removeRatedGame={this.removeRatedGame}
          />
          {appHelper.isPhoneSize({ size }) && <RatePercent percent={percent} className="rate-games-list__percent" />}
        </Content>
        {appHelper.isDesktopSize({ size }) && results.length > 0 && <RateNavInfo />}
      </Page>
    );
  }
}
