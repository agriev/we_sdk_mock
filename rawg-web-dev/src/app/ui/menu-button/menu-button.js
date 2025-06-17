import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './menu-button.styl';

export const menuButtonPropTypes = {
  onClick: PropTypes.func,
  kind: PropTypes.oneOf(['inline', 'outline']),
  className: PropTypes.string,
};

const defaultProps = {
  onClick: undefined,
  kind: undefined,
  className: '',
};

export default class MenuButton extends Component {
  static propTypes = menuButtonPropTypes;

  static defaultProps = defaultProps;

  getClassName() {
    const { kind, className } = this.props;

    return classnames('menu-button', {
      [`menu-button_${kind}`]: kind,
      [className]: className,
    });
  }

  handleClick = (e) => {
    const { onClick } = this.props;

    if (typeof onClick === 'function') {
      e.preventDefault();
      e.stopPropagation();

      onClick();
    }
  };

  render() {
    return (
      <div className={this.getClassName()} onClick={this.handleClick} role="button" tabIndex={0}>
        •••
      </div>
    );
  }
}
