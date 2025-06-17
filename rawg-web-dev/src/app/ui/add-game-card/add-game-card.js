import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Link } from 'app/components/link';

import './add-game-card.styl';
import { hot } from 'react-hot-loader/root';

export const addGameCardPropTypes = {
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  title: PropTypes.oneOfType([PropTypes.element, PropTypes.string]),
  icon: PropTypes.node,
  count: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  path: PropTypes.string,
  wide: PropTypes.bool,
  className: PropTypes.string,
};

const defaultProps = {
  disabled: false,
  onClick: undefined,
  title: undefined,
  icon: '+',
  count: undefined,
  path: undefined,
  wide: false,
  className: '',
};

@hot
export default class AddGameCard extends Component {
  static propTypes = addGameCardPropTypes;

  static defaultProps = defaultProps;

  getClassName() {
    const { className, disabled, wide } = this.props;

    return classnames('add-game-card', {
      'add-game-card_disabled': disabled,
      'add-game-card_wide': wide,
      [className]: className,
    });
  }

  handleClick = () => {
    const { onClick, disabled } = this.props;

    if (disabled) return;

    if (typeof onClick === 'function') {
      onClick();
    }
  };

  renderCount = () => {
    const { count } = this.props;

    if (count) {
      return <span className="add-game-card__count">&nbsp;{count}</span>;
    }

    return null;
  };

  render() {
    const { title, icon, path } = this.props;
    const ContainerTag = path ? Link : 'div';

    return (
      <ContainerTag className={this.getClassName()} onClick={this.handleClick} to={path} role="button" tabIndex={0}>
        <div className="add-game-card__icon">{icon}</div>
        <div className="add-game-card__title">
          {title}
          {this.renderCount()}
        </div>
        <div className="add-game-card__disabled-content">
          <span className="add-game-card__disabled-content__smile" role="img" aria-label="sleeping">
            😴
          </span>
          <div className="add-game-card__disabled-content__text">No game here yet</div>
        </div>
      </ContainerTag>
    );
  }
}
