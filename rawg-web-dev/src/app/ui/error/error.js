import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import './error.styl';

export const errorPropTypes = {
  error: PropTypes.string.isRequired,
  kind: PropTypes.oneOf(['field', 'form']),
  className: PropTypes.string,
  isIcon: PropTypes.bool,
};

const defaultProps = {
  kind: undefined,
  className: '',
  isIcon: false,
};

const Error = ({ kind, error, className, isIcon }) => (
  <span
    className={cn(
      'error',
      {
        [`error_${kind}`]: kind,
        error__icon: isIcon,
      },
      className,
    )}
  >
    {error}
  </span>
);

Error.propTypes = errorPropTypes;
Error.defaultProps = defaultProps;

export default Error;
