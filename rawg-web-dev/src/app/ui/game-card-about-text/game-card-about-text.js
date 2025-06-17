import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';
import { compose } from 'recompose';

import isString from 'lodash/isString';

import './game-card-about-text.styl';

import TruncateBlockByHeight from 'app/ui/truncate-block-by-height';
import { displayAboutText } from 'app/pages/game/game.helper';

const hoc = compose(hot);

const propTypes = {
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.node]),
};

const defaultProps = {
  description: '',
};

const GameCardAboutTextComponent = ({ description }) => {
  if (!description) {
    return null;
  }

  if (isString(description)) {
    return (
      <TruncateBlockByHeight
        className="game-card__about-text"
        phone
        desktop
        maxHeight={200}
        length={description.length}
      >
        {displayAboutText(description)}
      </TruncateBlockByHeight>
    );
  }

  return description;
};

GameCardAboutTextComponent.propTypes = propTypes;
GameCardAboutTextComponent.defaultProps = defaultProps;

const GameCardAboutText = hoc(GameCardAboutTextComponent);

export default GameCardAboutText;
