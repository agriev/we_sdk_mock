import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import './aspect-ratio-container-16x9.styl';

const componentPropertyTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

const defaultProps = {
  className: '',
};

const AspectRatioContainer16x9 = ({ children, className }) => (
  <div className={cn('aspect-ratio-container-16x9', className)}>
    <div className="aspect-ratio-container-16x9__inner">{children}</div>
  </div>
);

AspectRatioContainer16x9.propTypes = componentPropertyTypes;
AspectRatioContainer16x9.defaultProps = defaultProps;

export default AspectRatioContainer16x9;
