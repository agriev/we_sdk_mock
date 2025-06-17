import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './content.styl';

export const contentPropTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.array]).isRequired,
  columns: PropTypes.oneOf(['1', '1-1', '1-1-1', '1-1-1-1', '1-2', '2-1']),
  position: PropTypes.oneOf(['center']),
  fullScreen: PropTypes.bool,
  fullSize: PropTypes.bool,
  className: PropTypes.string,
};

const defaultProps = {
  columns: undefined,
  position: undefined,
  fullScreen: false,
  fullSize: false,
  className: '',
};

class Content extends Component {
  static propTypes = contentPropTypes;

  static defaultProps = defaultProps;

  get className() {
    const { columns, position, fullScreen, fullSize, className } = this.props;

    return classnames('content', {
      [`content_columns-${columns}`]: columns,
      [`content_position-${position}`]: position,
      content_fullscreen: fullScreen,
      content_fullsize: fullSize,
      [className]: className,
    });
  }

  render() {
    return <div className={this.className}>{this.props.children}</div>;
  }
}

export default Content;
