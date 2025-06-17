import React from 'react';
import { hot } from 'react-hot-loader/root';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { compose } from 'recompose';

import GameCardFeatured from 'app/components/game-card-featured';

import gameType from 'app/pages/game/game.types';
import currentUserType from 'app/components/current-user/current-user.types';

import './game-card-featured-list.styl';

const hoc = compose(hot);

const propTypes = {
  className: PropTypes.string,
  currentUser: currentUserType.isRequired,
  dispatch: PropTypes.func.isRequired,
  games: PropTypes.arrayOf(gameType.isRequired).isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  withStartedPlaying: PropTypes.bool,
};

const defaultProps = {
  className: '',
  withStartedPlaying: false,
};

const GameCardFeaturedListComponent = (props) => {
  const { games, currentUser, dispatch, allRatings, withStartedPlaying, className } = props;

  const listClassName = cn('game-card-featured-list', className);

  return (
    <div className={listClassName}>
      <div className="game-card-featured-list__wrapper">
        {games.map((game, index) => (
          <GameCardFeatured
            key={game.id}
            game={game}
            dispatch={dispatch}
            currentUser={currentUser}
            allRatings={allRatings}
            withStartedPlaying={withStartedPlaying}
            number={index}
          />
        ))}
      </div>
    </div>
  );
};

GameCardFeaturedListComponent.propTypes = propTypes;
GameCardFeaturedListComponent.defaultProps = defaultProps;

const GameCardFeaturedList = hoc(GameCardFeaturedListComponent);

export default GameCardFeaturedList;
