import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';

import get from 'lodash/get';

import searchIcon from 'assets/icons/search.svg';
import './input-search.styl';

export const inputSearchPropTypes = {
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  onKeyDown: PropTypes.func,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  autoFocus: PropTypes.bool,
  visible: PropTypes.bool,
  className: PropTypes.string,
  inputProperties: PropTypes.shape(),
  containerProperties: PropTypes.shape(),
};

const defaultProps = {
  autoFocus: false,
  visible: false,
  placeholder: '',
  className: '',
  value: '',
  inputProperties: undefined,
  containerProperties: undefined,
  onBlur: undefined,
  onKeyDown: undefined,
};

export default class InputSearch extends Component {
  static propTypes = inputSearchPropTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    const { value } = this.props;

    this.state = {
      value,
    };

    this.input = React.createRef();
  }

  componentDidMount() {
    const { autoFocus } = this.props;

    if (autoFocus) {
      this.input.current.focus();
    }
  }

  componentDidUpdate() {
    const { value, visible } = this.props;

    if (visible && (!this.state.value || !value)) {
      const input = get(this, 'input.input');
      if (input) {
        input.focus();
      }
    }
  }

  getInput() {
    return this.input.current;
  }

  handleInput = (e) => {
    const { value } = e.target;
    const { onChange } = this.props;

    this.setState({ value });
    onChange(value);
  };

  resetInput = () => {
    this.setState({ value: '' });
  };

  render() {
    const { value } = this.state;
    const { placeholder = '', className, inputProperties, containerProperties } = this.props;

    return (
      <div className={cn('input-search', className)} {...containerProperties}>
        <SVGInline svg={searchIcon} className="input-search__icon" />
        <input
          className="input-search__input"
          ref={this.input}
          placeholder={placeholder}
          value={value}
          onChange={this.handleInput}
          onBlur={this.props.onBlur}
          onKeyDown={this.props.onKeyDown}
          {...inputProperties}
        />
      </div>
    );
  }
}
