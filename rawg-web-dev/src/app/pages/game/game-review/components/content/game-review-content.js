import React from 'react';
import PropTypes from 'prop-types';

import AstTree from 'app/components/ast-tree';

import gameType from 'app/pages/game/game.types';

import { getReviewAst } from './game-review-content.helpers';

import './game-review-content.styl';

const propTypes = {
  isDesktop: PropTypes.bool.isRequired,
  game: gameType,
};

const defaultProps = {
  game: undefined,
};

const GameReviewContent = ({ game, isDesktop }) => (
  <div className="game_review__content">
    <AstTree ast={getReviewAst({ html: game.review.text, game, isDesktop })} />
  </div>
);

GameReviewContent.propTypes = propTypes;
GameReviewContent.defaultProps = defaultProps;

export default GameReviewContent;
