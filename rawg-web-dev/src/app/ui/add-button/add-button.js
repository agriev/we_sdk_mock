import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import plusIcon from 'assets/icons/plus.svg';
import SVGInline from 'react-svg-inline';
import './add-button.styl';

export const addButtonPropTypes = {
  size: PropTypes.oneOf(['medium', 'small']),
  onClick: PropTypes.func,
  className: PropTypes.string,
};

const defaultProps = {
  onClick: undefined,
  size: undefined,
  className: '',
};

export default class AddButton extends React.Component {
  static propTypes = addButtonPropTypes;

  static defaultProps = defaultProps;

  getClassName() {
    const { size, className } = this.props;

    return classnames('add-button', {
      [`add-button_${size}`]: size,
      [className]: className,
    });
  }

  handleClick = () => {
    const { onClick } = this.props;

    if (typeof onClick === 'function') {
      onClick();
    }
  };

  render() {
    return (
      <div className={this.getClassName()} onClick={this.handleClick} role="button" tabIndex={0}>
        <SVGInline svg={plusIcon} />
      </div>
    );
  }
}
