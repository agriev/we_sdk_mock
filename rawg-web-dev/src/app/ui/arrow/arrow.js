import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import SVGInline from 'react-svg-inline';

import arrowIcon from 'assets/icons/arrow.svg';

import './arrow.styl';

export const arrowPropTypes = {
  size: PropTypes.oneOf(['large', 'medium', 'small']),
  direction: PropTypes.oneOf(['right', 'left', 'bottom', 'top']).isRequired,
  className: PropTypes.string,
};

const defaultProps = {
  size: 'large',
  className: '',
};

export default class Arrow extends Component {
  static propTypes = arrowPropTypes;

  static defaultProps = defaultProps;

  get className() {
    const { className, size, direction } = this.props;

    return classnames('arrow', `arrow_${size}`, `arrow_${direction}`, {
      [className]: className,
    });
  }

  renderIcon = () => <SVGInline svg={arrowIcon} className="arrow__icon" />;

  render() {
    return <div className={this.className}>{this.renderIcon()}</div>;
  }
}
