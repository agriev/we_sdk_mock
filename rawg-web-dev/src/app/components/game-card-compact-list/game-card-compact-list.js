import React from 'react';
import { hot } from 'react-hot-loader/root';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { compose } from 'recompose';

import isArray from 'lodash/isArray';

import GameCardCompact from 'app/components/game-card-compact';

import gameType from 'app/pages/game/game.types';
import currentUserType from 'app/components/current-user/current-user.types';

import './game-card-compact-list.styl';
import passDownProps from 'tools/pass-down-props';

const hoc = compose(hot);

const propTypes = {
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  className: PropTypes.string,
  currentUser: currentUserType,
  dispatch: PropTypes.func,
  games: PropTypes.arrayOf(gameType.isRequired).isRequired,
  kind: PropTypes.oneOf(['default', '3-columns', '3-columns-desktop', 'one-line']),
  withStartedPlaying: PropTypes.bool,
  withDate: PropTypes.bool,
  withChart: PropTypes.bool,
  gameCardProperties: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
};

const defaultProps = {
  className: '',
  kind: 'default',
  currentUser: undefined,
  dispatch: undefined,
  withStartedPlaying: false,
  withDate: false,
  withChart: false,
  gameCardProperties: undefined,
};

const GameCardCompactListComponent = ({
  className,
  games,
  currentUser,
  dispatch,
  kind,
  withStartedPlaying,
  withDate,
  withChart,
  gameCardProperties,
  allRatings,
}) => {
  if (!isArray(games)) {
    return null;
  }

  const listClassName = cn('game-card-compact-list', `game-card-compact-list_${kind}`, className);

  return (
    <div className={listClassName}>
      <div className="game-card-compact-list__wrapper">
        {games.map((game) => (
          <GameCardCompact
            key={game.id}
            game={game}
            dispatch={dispatch}
            currentUser={currentUser}
            withStartedPlaying={withStartedPlaying}
            withDate={withDate}
            withChart={withChart}
            allRatings={allRatings}
            {...passDownProps(gameCardProperties, game)}
          />
        ))}
      </div>
    </div>
  );
};

GameCardCompactListComponent.propTypes = propTypes;
GameCardCompactListComponent.defaultProps = defaultProps;

const GameCardCompactList = hoc(GameCardCompactListComponent);

export default GameCardCompactList;
