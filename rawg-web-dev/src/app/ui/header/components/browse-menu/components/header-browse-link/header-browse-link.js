import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';

export const labelPropType = PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.element]);

const propTypes = {
  label: labelPropType.isRequired,
  path: PropTypes.string.isRequired,
  className: PropTypes.string,
};

const defaultProps = {
  className: '',
};

const HeaderBrowseLink = ({ label, path, className }) => (
  <Link tabIndex={0} className={className} to={path}>
    {label}
  </Link>
);

HeaderBrowseLink.propTypes = propTypes;
HeaderBrowseLink.defaultProps = defaultProps;

export default HeaderBrowseLink;
