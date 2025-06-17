import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import GameCardCompact from 'app/components/game-card-compact';

import currentUserType from 'app/components/current-user/current-user.types';
import gameType from 'app/pages/game/game.types';

import './one-game-event.styl';

const componentPropertyTypes = {
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  game: gameType.isRequired,
  dispatch: PropTypes.func.isRequired,
  currentUser: currentUserType.isRequired,

  className: PropTypes.string,
  description: PropTypes.string,
  isLarge: PropTypes.bool,
  children: PropTypes.node,
};

const defaultProps = {
  className: '',
  description: '',
  isLarge: true,
  children: undefined,
};

const OneGameEvent = (props) => {
  const { className, game, description, isLarge, children, dispatch, currentUser, allRatings } = props;

  return (
    <div className={cn('one-game-event', className)}>
      <GameCardCompact game={game} dispatch={dispatch} currentUser={currentUser} allRatings={allRatings} />
      {isLarge && children}
      {isLarge && description && <div className="one-game-event__description">{description}</div>}
    </div>
  );
};

OneGameEvent.propTypes = componentPropertyTypes;
OneGameEvent.defaultProps = defaultProps;

export default OneGameEvent;
