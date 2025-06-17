/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader/root';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';
import { prepareSuggestions } from 'app/pages/game/game.prepare';
import appHelper from 'app/pages/app/app.helper';
import whenData from 'tools/logic/when-data';
import getPagesCount from 'tools/get-pages-count';

import gameType from 'app/pages/game/game.types';

import ListLoader from 'app/ui/list-loader';
import GameSubpage from 'app/components/game-subpage';
import ModeSelector from 'app/components/mode-selector';

import GameCardMediumList from 'app/components/game-card-medium-list';
import GameCardLarge from 'app/components/game-card-large';
import GameCardMedium from 'app/components/game-card-medium';

import { MODE_SELECTOR_COLUMNS, MODE_SELECTOR_LIST } from 'app/components/mode-selector/mode-selector.helper';

import { loadGameSuggestions, PAGE_SIZE } from 'app/pages/game/game.actions';
import currentUserType from 'app/components/current-user/current-user.types';

import './game-suggestions.styl';

const propTypes = {
  appSize: PropTypes.string.isRequired,
  game: gameType.isRequired,
  suggestedGames: PropTypes.arrayOf(PropTypes.shape().isRequired).isRequired,
  dispatch: PropTypes.func.isRequired,
  currentUser: currentUserType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
};

@hot
@prepare(prepareSuggestions, { updateParam: 'id' })
@connect((state) => ({
  appSize: state.app.size,
  allRatings: state.app.ratings,
  game: denormalizeGame(state),
  suggestedGames: denormalizeGamesArr(state, 'game.suggestions.results'),
  currentUser: state.currentUser,
}))
export default class GameSuggestions extends Component {
  static propTypes = propTypes;

  constructor(...arguments_) {
    super(...arguments_);

    this.state = {
      displayMode: MODE_SELECTOR_LIST,
    };
  }

  load = () => {
    const { dispatch, game } = this.props;
    const {
      slug,
      suggestions: { next },
    } = game;

    return dispatch(loadGameSuggestions(slug, next));
  };

  setModeHandler = ({ mode }) => () => {
    this.setState({ displayMode: mode });
  };

  renderSubheading() {
    const { appSize } = this.props;
    const { displayMode } = this.state;

    if (appHelper.isPhoneSize({ size: appSize })) return undefined;

    return <ModeSelector displayMode={displayMode} setModeHandler={this.setModeHandler} />;
  }

  render() {
    const { game, currentUser, dispatch, suggestedGames, appSize, allRatings } = this.props;
    const { displayMode } = this.state;

    if (!game.id) return null;

    const { suggestions } = game;
    const { loading, next, count, seo_text } = suggestions;

    const isDesktop = appHelper.isDesktopSize(appSize);
    const showColumns = isDesktop && displayMode === MODE_SELECTOR_COLUMNS;
    const showListLarge = isDesktop && displayMode === MODE_SELECTOR_LIST;
    const showListMedium = appHelper.isPhoneSize(appSize);
    const description = whenData(seo_text, () => <div className="game-subpage__description">{seo_text}</div>);

    return (
      <GameSubpage section="suggestions" nearHeading={this.renderSubheading()}>
        {description}
        {Array.isArray(suggestedGames) && (
          <div className="game-suggestions__items">
            <ListLoader
              load={this.load}
              count={count}
              next={next}
              loading={loading}
              pages={getPagesCount(count, PAGE_SIZE)}
              isOnScroll
            >
              {showColumns && (
                <GameCardMediumList
                  columns={3}
                  containerWidth={632}
                  appSize={appSize}
                  currentUser={currentUser}
                  dispatch={dispatch}
                  games={suggestedGames}
                  allRatings={allRatings}
                  gameCardProperties={{
                    showMoreButton: true,
                  }}
                />
              )}
              {showListLarge &&
                suggestedGames.map((item) => (
                  <GameCardLarge
                    key={item.id}
                    className="game-suggestions__game-card-large"
                    appSize={appSize}
                    currentUser={currentUser}
                    dispatch={dispatch}
                    allRatings={allRatings}
                    game={item}
                    showAboutText
                    aboutText={item.short_description}
                    playVideoOnHitScreen
                    showMoreButton
                  />
                ))}
              {showListMedium &&
                suggestedGames.map((item) => (
                  <GameCardMedium
                    key={item.id}
                    className="game-suggestions__game-card-medium"
                    appSize={appSize}
                    currentUser={currentUser}
                    dispatch={dispatch}
                    allRatings={allRatings}
                    game={item}
                    showMoreButton
                    showAboutText
                    aboutText={item.short_description}
                  />
                ))}
            </ListLoader>
          </div>
        )}
      </GameSubpage>
    );
  }
}
