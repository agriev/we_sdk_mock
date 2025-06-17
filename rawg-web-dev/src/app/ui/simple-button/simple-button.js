import React from 'react';
import PropTypes from 'prop-types';

import './simple-button.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  handleClick: PropTypes.func,
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]).isRequired,
};

const defaultProps = {
  handleClick: undefined,
  className: '',
};

const SimpleButton = ({ className, children, handleClick }) => {
  return (
    <div onClick={handleClick} className={['simple-button', className].join(' ')} role="button" tabIndex={0}>
      {children}
    </div>
  );
};

SimpleButton.propTypes = componentPropertyTypes;

SimpleButton.defaultProps = defaultProps;

export default SimpleButton;
