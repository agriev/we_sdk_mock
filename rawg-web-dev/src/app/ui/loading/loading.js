import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import SVGInline from 'react-svg-inline';

import loaderIcon from 'assets/icons/loader.svg';
import './loading.styl';

export const loadingPropTypes = {
  size: PropTypes.oneOf(['x-small', 'small', 'medium', 'large']),
  className: PropTypes.string,
};

export const loadingDefaultProps = {
  size: '',
  className: '',
};

export default class Loading extends Component {
  static propTypes = loadingPropTypes;

  static defaultProps = loadingDefaultProps;

  get className() {
    const { size, className } = this.props;

    return classnames('loading', {
      [`loading_${size}`]: size,
      [className]: className,
    });
  }

  render() {
    return <SVGInline svg={loaderIcon} className={this.className} />;
  }
}
