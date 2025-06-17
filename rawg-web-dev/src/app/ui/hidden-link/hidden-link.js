import React, { useState, useEffect } from 'react';
import { Link, withRouter } from 'react-router';

import PropTypes from 'prop-types';
import cn from 'classnames';

import './hidden-link.styl';
import locationShape from 'tools/prop-types/location-shape';
import { compose } from 'recompose';

const hoc = compose(withRouter);

const propTypes = {
  to: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  location: locationShape.isRequired,

  target: PropTypes.string,
  className: PropTypes.string,
  activeClassName: PropTypes.string,
};

const defaultProps = {
  className: '',
  activeClassName: '',
  target: undefined,
};

const HiddenLinkComponent = ({ to, children, className, activeClassName, target, location }) => {
  const [linkEnabled, setLinkEnabled] = useState(false);
  const currentPath = location.pathname;
  const isCurrentPage = to === currentPath;
  const pseudoLinkClassName = cn('hidden-link', className, {
    [activeClassName]: isCurrentPage,
  });

  useEffect(() => {
    setLinkEnabled(true);
  }, []);

  return linkEnabled && !isCurrentPage ? (
    <Link className={className} to={to} target={target} activeClassName={activeClassName} onlyActiveOnIndex>
      {children}
    </Link>
  ) : (
    <span className={pseudoLinkClassName} role="link" tabIndex="0">
      {children}
    </span>
  );
};

HiddenLinkComponent.propTypes = propTypes;
HiddenLinkComponent.defaultProps = defaultProps;

const HiddenLink = hoc(HiddenLinkComponent);

export default HiddenLink;
