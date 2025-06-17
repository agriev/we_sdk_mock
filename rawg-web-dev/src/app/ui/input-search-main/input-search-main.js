import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import './input-search-main.styl';

export const InputSearchMainPropTypes = {
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  className: PropTypes.string,
};

const defaultProps = {
  onChange: () => {},
  placeholder: '',
  value: '',
  className: '',
};

class InputSearchMain extends React.PureComponent {
  static propTypes = InputSearchMainPropTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    const { value } = this.props;
    this.state = {
      value,
      active: false,
    };
  }

  get className() {
    const { className } = this.props;

    return classnames('input-search-main', {
      [className]: className,
    });
  }

  setFocus = () => {
    this.textInput.focus();
  };

  handleInput = (e) => {
    const { value } = e.target;
    const { onChange } = this.props;
    this.setState({ value });
    onChange(value);
  };

  handleFocus = () => {
    this.setState({ active: true });
  };

  handleBlur = () => {
    setTimeout(() => {
      if (this.state.value === '') this.setState({ active: false });
    }, 200);
  };

  render() {
    const { placeholder } = this.props;
    const { value } = this.state;

    return (
      <div className={this.className}>
        <div
          className={[
            'input-search-main__background',
            this.state.active ? 'input-search-main__background__focused' : '',
            value !== '' ? 'input-search-main__background-with-dropdown' : '',
          ].join(' ')}
        />
        <input
          className="input-search-main__input"
          ref={(input) => {
            this.textInput = input;
          }}
          placeholder={placeholder}
          value={value}
          onChange={this.handleInput}
          onFocus={this.handleFocus}
          onBlur={this.handleBlur}
        />
        <div className="input-search-main__icon" onClick={this.setFocus} role="button" tabIndex={0} />
        {/* <SVGInline
          svg={searchIcon}
          className="input-search-main__icon"
          onClick={this.setFocus}
        /> */}
      </div>
    );
  }
}

export default InputSearchMain;
