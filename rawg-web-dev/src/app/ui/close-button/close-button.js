import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push, goBack } from 'react-router-redux';
import classnames from 'classnames';
import SVGInline from 'react-svg-inline';

import closeIcon from 'assets/icons/close.svg';
import paths from 'config/paths';

import './close-button.styl';

export const closeButtonPropTypes = {
  className: PropTypes.string,
  onClick: PropTypes.func,
  size: PropTypes.oneOf(['small', 'medium']),
  dispatch: PropTypes.func.isRequired,
  returnBackPath: PropTypes.string,
};

const defaultProps = {
  onClick: undefined,
  size: undefined,
  className: '',
  returnBackPath: paths.index,
};

@connect()
export default class CloseButton extends Component {
  static propTypes = closeButtonPropTypes;

  static defaultProps = defaultProps;

  componentDidMount() {
    window.addEventListener('keydown', this.handleKeydown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeydown);
  }

  getClassName() {
    const { size, className } = this.props;

    return classnames('close-button', {
      [`close-button_${size}`]: size,
      [className]: className,
    });
  }

  handleClick = (e) => {
    this.close(e);
  };

  handleKeydown = (e) => {
    if ((e.key && (e.key === 'Escape' || e.key === 'Esc')) || e.keyCode === 27) {
      this.close();
    }
  };

  close = (e) => {
    const { dispatch, onClick, returnBackPath } = this.props;

    if (typeof onClick === 'function') {
      onClick(e);
    } else {
      dispatch(window.history.length > 1 ? goBack() : push(returnBackPath));
    }
  };

  render() {
    return (
      <div className={this.getClassName()} onClick={this.handleClick} role="button" tabIndex={0}>
        <SVGInline svg={closeIcon} className="close-button__icon" />
      </div>
    );
  }
}
