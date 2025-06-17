import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './tooltip.styl';

const tooltipPropertyTypes = {
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

const defaultProps = {
  className: undefined,
};

export default class Tooltip extends Component {
  static propTypes = tooltipPropertyTypes;

  static defaultProps = defaultProps;

  get className() {
    const { className } = this.props;

    return classnames('tooltip', {
      [className]: className,
    });
  }

  render() {
    return <div className={this.className}>{this.props.children}</div>;
  }
}
