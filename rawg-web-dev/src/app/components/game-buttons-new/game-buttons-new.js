import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { hot } from 'react-hot-loader/root';
import { compose } from 'recompose';

import './game-buttons-new.styl';

import { appSizeType } from 'app/pages/app/app.types';
import gameType from 'app/pages/game/game.types';
import currentUserType from 'app/components/current-user/current-user.types';

import BtnAddGame from './components/btn-add-game';
import BtnWishlist from './components/btn-wishlist';
import BtnCollection from './components/btn-collection';

const hoc = compose(hot);

const propTypes = {
  className: PropTypes.string,
  appSize: appSizeType.isRequired,
  currentUser: currentUserType.isRequired,
  game: gameType.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
};

const GameButtonsNewComponent = ({ appSize, game, currentUser, className, dispatch }) => (
  <div className={cn('game-buttons-new', className)}>
    <BtnAddGame appSize={appSize} dispatch={dispatch} currentUser={currentUser} game={game} />
    <BtnWishlist dispatch={dispatch} game={game} />
    <BtnCollection appSize={appSize} dispatch={dispatch} game={game} />
  </div>
);

GameButtonsNewComponent.propTypes = propTypes;
GameButtonsNewComponent.defaultProps = defaultProps;

const GameButtonsNew = hoc(GameButtonsNewComponent);

export default GameButtonsNew;
