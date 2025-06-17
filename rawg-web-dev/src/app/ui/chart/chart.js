import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './chart.styl';

const chartPropertyTypes = {
  index: PropTypes.number,
  size: PropTypes.oneOf(['big', 'medium', 'small']),
  chart: PropTypes.oneOf(['up', 'down', 'new', 'equal']),
  className: PropTypes.string,
};

const chartDefaultProperties = {
  index: 0,
  size: 'small',
  className: '',
  chart: undefined,
};

export default class Chart extends Component {
  static propTypes = chartPropertyTypes;

  static defaultProps = chartDefaultProperties;

  get className() {
    const { className, chart, size } = this.props;

    return classnames('chart', {
      [`chart_${chart}`]: chart,
      [`chart_${size}`]: size,
      [className]: className,
    });
  }

  render() {
    const { index, size } = this.props;

    return (
      <div className={this.className}>
        <div className="chart__number">{index + 1}</div>
        {(size === 'big' || size === 'medium') && '.'}
      </div>
    );
  }
}
