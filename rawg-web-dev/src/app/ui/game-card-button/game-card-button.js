import React from 'react';
import PropTypes from 'prop-types';
import SVGInline from 'react-svg-inline';
import cn from 'classnames';

import arrowIcon from 'assets/icons/arrow-down.svg';

import './game-card-button.styl';

const propTypes = {
  onClick: PropTypes.func.isRequired,
  icon: PropTypes.string,
  iconSize: PropTypes.oneOf([12, 16, 18, 20]),
  inner: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]),
  active: PropTypes.bool,
  kind: PropTypes.string.isRequired,
  theme: PropTypes.oneOf(['light', 'dark']),
  withArrow: PropTypes.bool,
  disabled: PropTypes.bool,
};

const defaultProps = {
  icon: undefined,
  inner: undefined,
  active: false,
  withArrow: false,
  iconSize: 12,
  disabled: false,
  theme: 'light',
};

const GameCardButton = ({ onClick, icon, inner, active, kind, withArrow, iconSize, disabled, theme }) => {
  const className = cn('game-card-button', `game-card-button_${kind}`, `game-card-button_${theme}`, {
    'game-card-button_active': active,
    'game-card-button_disabled': disabled,
  });

  const iconClassName = cn('game-card-button__icon', `game-card-button__icon_${iconSize}`, {
    'game-card-button__icon_with-offset': !!inner,
  });

  return (
    <button className={className} type="button" onClick={disabled ? undefined : onClick}>
      {icon && <SVGInline className={iconClassName} svg={icon} />}
      {!!inner && <span className="game-card-button__inner">{inner}</span>}
      {withArrow && (
        <div className="game-card-button__arrow">
          <SVGInline svg={arrowIcon} />
        </div>
      )}
    </button>
  );
};

GameCardButton.propTypes = propTypes;
GameCardButton.defaultProps = defaultProps;

export default GameCardButton;
