import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import './loading-2.styl';

const propTypes = {
  className: PropTypes.string,
  radius: PropTypes.number,
  stroke: PropTypes.number,
};

const defaultProps = {
  className: '',
  radius: 40,
  stroke: 4,
};

const Loading2 = ({ className, radius, stroke }) => (
  <div className={cn('loading-2', className)}>
    <svg className="loading-2__circular" viewBox="25 25 50 50">
      <circle
        className="loading-2__path"
        cx="50"
        cy="50"
        r={radius / 2}
        fill="none"
        strokeWidth={stroke}
        strokeMiterlimit="10"
      />
    </svg>
  </div>
);

Loading2.propTypes = propTypes;
Loading2.defaultProps = defaultProps;

export default Loading2;
