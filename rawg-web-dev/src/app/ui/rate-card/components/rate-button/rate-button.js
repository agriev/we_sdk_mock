import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import cn from 'classnames';

import './rate-button.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  icon: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  type: PropTypes.string.isRequired,
  ratingID: PropTypes.number.isRequired,
  handleButtonClick: PropTypes.func.isRequired,
  isRated: PropTypes.bool,
  isActive: PropTypes.bool,
  kind: PropTypes.oneOf(['light', 'dark']),
};

const defaultProps = {
  className: '',
  isRated: false,
  isActive: false,
  kind: 'light',
};

@connect((state) => ({
  app: state.app,
}))
class RateButton extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    const { className, icon, label, type, handleButtonClick, ratingID, isRated, isActive, kind } = this.props;

    return (
      <div
        className={cn('rate-button', `rate-button_${kind}`, className, [
          { 'rate-button_rated': isRated && isActive },
          { 'rate-button_disabled': !isActive },
        ])}
        onClick={!isRated ? () => handleButtonClick(ratingID) : () => {}}
        role="button"
        tabIndex={0}
      >
        <img className={['rate-button__img', `rate-button_${type}`].join(' ')} src={icon} alt={type} />
        <div className="rate-button__label">{label}</div>
      </div>
    );
  }
}

RateButton.defaultProps = defaultProps;

export default RateButton;
