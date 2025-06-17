import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import paths from 'config/paths';
import Button, { buttonPropTypes } from 'app/ui/button';

import arrowIcon from 'assets/icons/arrow.svg';
import arrowBlackIcon from 'assets/icons/arrow-black.svg';
import checkIcon from 'assets/icons/check.svg';

import './select-button.styl';

export const selectButtonPropTypes = {
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  multiple: PropTypes.bool,
  kind: PropTypes.oneOf(['fill', 'outline', 'inline']),
  onlyArrow: PropTypes.bool,
  className: PropTypes.string,
  size: buttonPropTypes.size,
  additional: PropTypes.node,
  active: PropTypes.bool,
};

const defaultProps = {
  placeholder: undefined,
  value: undefined,
  multiple: false,
  kind: undefined,
  onlyArrow: false,
  className: '',
  size: undefined,
  additional: undefined,
  active: false,
};

export default class SelectButton extends Component {
  static propTypes = selectButtonPropTypes;

  static defaultProps = defaultProps;

  constructor(...arguments_) {
    super(...arguments_);

    this.button = React.createRef();
  }

  getClassName() {
    const { kind, className, active } = this.props;

    return classnames('select-button', className, {
      [`select-button_${kind}`]: kind,
      active,
    });
  }

  render() {
    const { placeholder, value, multiple, kind, size, onlyArrow, additional, active } = this.props;

    return (
      <Button ref={this.button} className={this.getClassName()} kind={kind} size={size} onClick={this.open}>
        <div className="select-button__content">
          <div className="select-button__title">
            {(!multiple && value) || placeholder}
            {(additional || null) && <span className="select-button__additional">{additional}</span>}
          </div>
          {value && !onlyArrow ? (
            <img
              className="select-button__icon select-button__icon_check"
              src={paths.svgImagePath(checkIcon)}
              alt="arrow"
            />
          ) : (
            <img
              className="select-button__icon select-button__icon_arrow"
              src={paths.svgImagePath(active ? arrowBlackIcon : arrowIcon)}
              alt="arrow"
            />
          )}
        </div>
      </Button>
    );
  }
}
