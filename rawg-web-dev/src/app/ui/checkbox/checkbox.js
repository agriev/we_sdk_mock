import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SVGInline from 'react-svg-inline';
import classnames from 'classnames';

import checkIcon from 'assets/icons/check.svg';
import './checkbox.styl';

export const checkboxPropTypes = {
  checked: PropTypes.bool,
  label: PropTypes.node,
  onChange: PropTypes.func,
};

const defaultProps = {
  checked: false,
  label: undefined,
  onChange: undefined,
};

export default class Checkbox extends Component {
  static propTypes = checkboxPropTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    const { checked } = this.props;

    this.state = { checked };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.checked !== state.checked) {
      return {
        checked: props.checked,
      };
    }

    return null;
  }

  getClassName() {
    const { checked } = this.state;

    return classnames('checkbox', {
      checkbox_checked: checked,
    });
  }

  toggle = () => {
    const { onChange } = this.props;
    const { checked } = this.state;

    this.setState({ checked: !checked });

    if (typeof onChange === 'function') {
      onChange(!checked);
    }
  };

  render() {
    const { label } = this.props;
    const { checked } = this.state;

    return (
      <div className={this.getClassName()} onClick={this.toggle} role="button" tabIndex={0}>
        <div className="checkbox__input">{checked && <SVGInline svg={checkIcon} />}</div>
        {label}
      </div>
    );
  }
}
