/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import differenceBy from 'lodash/differenceBy';
import findIndex from 'lodash/findIndex';

import prepare from 'tools/hocs/prepare';
import config from 'config/config';
import appHelper from 'app/pages/app/app.helper';
import { getRatedGames, saveRating } from 'app/pages/rate-games/rate-games.helper.js';
import { loadTopGames, removeRatedGame } from 'app/pages/rate-games/rate-games.actions';
import { createReview } from 'app/components/review-form/review-form.actions';

import { appLocaleType } from 'app/pages/app/app.types';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import RateGamesList from 'app/components/rate-games-list/rate-games-list';

import currentUserType from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import RateNavInfo from '../../components/rate-nav-info';
import RateLandingHeading from '../../components/rate-landing-heading';
import RateLandingAbout from '../../components/rate-landing-about';
import RateLandingSignup from '../../components/rate-landing-signup';
import RateLandingProgress from '../../components/rate-landing-progress';
import RateLandingShare from '../../components/rate-landing-share';

import './rate-top-games.styl';

const componentPropertyTypes = {
  intl: intlShape.isRequired,
  size: PropTypes.string.isRequired,
  locale: appLocaleType.isRequired,
  games: PropTypes.shape({
    results: PropTypes.array.isRequired,
  }).isRequired,
  currentUser: currentUserType.isRequired,
  dispatch: PropTypes.func.isRequired,
  location: locationShape.isRequired,
};

const defaultProps = {};

const getNotRatedGames = (games) => ({
  ...games,
  results: differenceBy(games.results, getRatedGames(), 'id'),
  count: games.total_games - games.count,
  rated: getRatedGames().length,
});

@prepare()
@connect((state) => ({
  size: state.app.size,
  locale: state.app.locale,
  games: state.rateGames,
  currentUser: state.currentUser,
}))
@injectIntl
export default class RateTopGames extends Component {
  static propTypes = componentPropertyTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.state = {
      games: getNotRatedGames(props.games),
    };
  }

  componentDidMount() {
    const { dispatch } = this.props;

    dispatch(loadTopGames());
  }

  static getDerivedStateFromProps(props) {
    const games = getNotRatedGames(props.games);

    return { games };
  }

  getAssetPath = (assetName) => {
    const { assetsPath, clientAddress, locale } = config;
    const path = `${clientAddress[locale]}${assetsPath}${locale}/`;

    return `${path}${assetName}`;
  };

  changeRatingAnonymous = async ({ rating, game }) => {
    const { id, slug } = game;

    await saveRating({
      id,
      slug,
      rating,
      date: new Date(),
    });
  };

  changeRatingUser = async ({ rating, game }) => {
    const { dispatch } = this.props;
    const { id, slug } = game;

    await dispatch(
      createReview({
        id,
        slug,
        rating,
        redirect: false,
        isBack: false,
        addToLibrary: true,
      }),
    );
  };

  removeRatedGameAnonymous = (game) => {
    const {
      dispatch,
      games: { results },
    } = this.props;
    const index = findIndex(results, game);

    this.setState({ games: getNotRatedGames(this.props.games) });

    dispatch(removeRatedGame(index));
  };

  removeRatedGameUser = (game) => {
    const {
      dispatch,
      games: { results },
    } = this.props;
    const index = findIndex(results, game);

    dispatch(removeRatedGame(index));
  };

  render() {
    const { currentUser, intl, size, location, dispatch, locale } = this.props;
    const { games } = this.state;
    const rateGames = getRatedGames();

    return (
      <Page
        helmet={{
          title: intl.formatMessage({ id: 'rate_games.top_title' }),
          description: intl.formatMessage({ id: 'rate_games.top_description' }),
          image: this.getAssetPath('rate-top-share.png'),
        }}
        header={{ display: true }}
        className="rate-top-games"
      >
        <Content columns="1">
          <RateLandingHeading locale={locale} />
          <RateLandingProgress games={games} />
          <RateGamesList
            location={this.props.location}
            games={games}
            ratedGames={rateGames}
            changeRating={currentUser.id ? this.changeRatingUser : this.changeRatingAnonymous}
            removeRatedGame={currentUser.id ? this.removeRatedGameUser : this.removeRatedGameAnonymous}
            ratedText="Top-100 games are now rated."
            type="top-100"
            isShareVisible
            isSignupVisible
            isImportVisible
          />
          <RateLandingShare type="button" />
          <RateLandingAbout locale={locale} />
          <RateLandingSignup currentUser={currentUser} location={location} dispatch={dispatch} locale={locale} />
          {appHelper.isDesktopSize({ size }) && games.results.length > 0 && <RateNavInfo />}
        </Content>
      </Page>
    );
  }
}
