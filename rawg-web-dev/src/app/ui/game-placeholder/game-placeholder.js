import React from 'react';

import './game-placeholder.styl';

const GamePlaceholder = () => (
  <div className="game-placeholder">
    <div className="game-placeholder__cover" />
    <div className="game-placeholder__body">
      <div className="game-placeholder__title" />
      <div className="game-placeholder__platforms" />
    </div>
    <div className="game-placeholder__button" />
  </div>
);

export default GamePlaceholder;
