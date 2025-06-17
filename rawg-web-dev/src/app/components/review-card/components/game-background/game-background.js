/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import isPlainObject from 'lodash/isPlainObject';

import './game-background.styl';

import gameType from 'app/pages/game/game.types';

import resize from 'tools/img/resize';
import appHelper from 'app/pages/app/app.helper';

const propTypes = {
  showGameInfo: PropTypes.bool.isRequired,
  game: gameType.isRequired,
  review: PropTypes.shape().isRequired,
  size: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  visible: PropTypes.bool.isRequired,
};

const defaultProps = {};

const getStyle = ({ propsGame, reviewGame, size, showGameInfo, visible, color }) => {
  const game = isPlainObject(reviewGame) ? reviewGame : propsGame;

  if (!(showGameInfo && game)) return undefined;

  const { background_image = '' } = game;
  const imageSize = appHelper.isDesktopSize({ size }) ? 1280 : 640;

  if (!background_image) {
    return null;
  }

  if (!color) {
    return {
      backgroundImage: visible ? `url('${resize(imageSize, background_image)}')` : 'none',
    };
  }

  return {
    backgroundImage:
      background_image && visible
        ? `
      linear-gradient(rgba(32, 32, 32, 0.8), rgb(32, 32, 32) 30%),
      url('${resize(imageSize, background_image)}')
    `
        : `linear-gradient(to bottom, transparent, ${color})`,
  };
};

const ReviewCardGameBackground = ({ showGameInfo, game, size, review, color, visible }) => {
  if (!showGameInfo || !game) {
    return null;
  }

  const { game: reviewGame } = review;

  return (
    <div
      className="review-card__game-background"
      style={getStyle({
        showGameInfo,
        visible,
        reviewGame,
        size,
        propsGame: game,
        color,
      })}
    />
  );
};

ReviewCardGameBackground.propTypes = propTypes;
ReviewCardGameBackground.defaultProps = defaultProps;

export default ReviewCardGameBackground;
