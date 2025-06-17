import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import './discover-header.styl';

import Heading from 'app/ui/heading';

const propTypes = {
  isPhoneSize: PropTypes.bool.isRequired,
  className: PropTypes.string,
  children: PropTypes.node,
  heading: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
};

const defaultProps = {
  className: undefined,
  children: undefined,
  heading: undefined,
};

const DiscoverHeader = ({ className, children, heading, isPhoneSize }) => (
  <div className={cn('discover-header', className)}>
    {heading && (
      <Heading centred={isPhoneSize} className="discover-header__heading" withMobileOffset rank={1}>
        {heading}
      </Heading>
    )}
    {children}
  </div>
);

DiscoverHeader.propTypes = propTypes;

DiscoverHeader.defaultProps = defaultProps;

export default DiscoverHeader;
