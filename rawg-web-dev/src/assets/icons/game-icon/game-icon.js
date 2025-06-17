import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './game-icon.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
};

const defaultProps = {
  className: '',
};

const GameIcon = (props) => {
  let { className } = props;

  className = classnames('game-icon', {
    [className]: className,
  });

  return <div className={className} />;
};

GameIcon.propTypes = componentPropertyTypes;
GameIcon.defaultProps = defaultProps;

export default GameIcon;
