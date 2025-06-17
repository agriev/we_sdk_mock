import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';

import './more-button.styl';

import trans from 'tools/trans';

const propTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.array]),
  onClick: PropTypes.func,
  to: PropTypes.string,
};

const defaultProps = {
  children: undefined,
  onClick: undefined,
  to: undefined,
};

const MoreButton = ({ children, to, onClick }) => {
  const Element = to ? Link : 'div';

  return (
    <Element
      className="more-button"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
    >
      {children || trans('shared.truncate_button')}
    </Element>
  );
};

MoreButton.propTypes = propTypes;
MoreButton.defaultProps = defaultProps;

export default MoreButton;
