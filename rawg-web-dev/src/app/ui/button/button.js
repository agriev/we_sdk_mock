/* eslint-disable react/button-has-type */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import Loading from 'app/ui/loading';

import './button.styl';

export const buttonPropTypes = {
  type: PropTypes.string,
  kind: PropTypes.oneOf(['fill', 'outline', 'inline', 'fill-inline']),
  size: PropTypes.oneOf(['small', 'medium']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  onClick: PropTypes.func,
  onClickCapture: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.array]),
};

const defaultProps = {
  type: '',
  kind: undefined,
  size: undefined,
  disabled: false,
  loading: false,
  onClick: undefined,
  onClickCapture: undefined,
  className: '',
  children: null,
};

export default class Button extends Component {
  static propTypes = buttonPropTypes;

  static defaultProps = defaultProps;

  constructor(...arguments_) {
    super(...arguments_);

    this.el = React.createRef();
  }

  getClassName() {
    const { kind, size, className, loading } = this.props;

    return classnames('button', {
      [`button_${kind}`]: kind,
      [`button_${size}`]: size,
      [className]: className,
      button_loading: loading,
    });
  }

  handleClick = (e) => {
    if (typeof this.props.onClick === 'function') {
      this.props.onClick(e);
    }
  };

  handleClickCapture = (e) => {
    if (typeof this.props.onClickCapture === 'function') {
      this.props.onClickCapture(e);
    }
  };

  render() {
    const { type, disabled, loading } = this.props;

    return (
      <button
        ref={this.el}
        className={this.getClassName()}
        type={type}
        disabled={disabled}
        onClick={this.handleClick}
        onClickCapture={this.handleClickCapture}
      >
        {loading ? <Loading size="small" /> : this.props.children}
      </button>
    );
  }
}
