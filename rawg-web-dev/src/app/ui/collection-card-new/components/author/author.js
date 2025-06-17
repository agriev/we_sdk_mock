/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';

const componentPropertyTypes = {
  username: PropTypes.string.isRequired,
  slug: PropTypes.string.isRequired,
  full_name: PropTypes.string.isRequired,
};

const defaultProps = {};

const Author = ({ username, slug, full_name }) => (
  <Link className="collection-card-new__author-container" to={paths.profile(slug)}>
    <span>{appHelper.getName({ full_name, username })}</span>
  </Link>
);

Author.propTypes = componentPropertyTypes;
Author.defaultProps = defaultProps;

export default Author;
