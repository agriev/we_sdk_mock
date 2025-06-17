import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { Link } from 'app/components/link';

import './more-game-options-button.styl';

const propTypes = {
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.array]).isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string,
  to: PropTypes.string,
};

const defaultProps = {
  className: undefined,
  onClick: undefined,
  to: undefined,
};

const MoreGameOptionsButton = ({ onClick, className, children, to }) => (
  <div className="more-game-options__bottom-item">
    {!!to && (
      <Link className={cn('more-game-options__link', className)} to={to}>
        {children}
      </Link>
    )}
    {!to && (
      <div className={cn('more-game-options__button', className)} onClick={onClick} role="button" tabIndex="0">
        {children}
      </div>
    )}
  </div>
);

MoreGameOptionsButton.propTypes = propTypes;

MoreGameOptionsButton.defaultProps = defaultProps;

export default MoreGameOptionsButton;
