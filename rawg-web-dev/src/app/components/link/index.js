import React from 'react';

import { Link as LinkRouter } from 'react-router';
import PropTypes from 'prop-types';

export const Link = (props) => {
  let path = props.to || '';

  if (typeof props.to === 'object') {
    path = String(props.to.pathname);
  }

  if (path.startsWith('/games/')) {
    // eslint-disable-next-line no-unused-vars
    const { to, href, ...propsWithoutTo } = props;

    // eslint-disable-next-line jsx-a11y/anchor-has-content
    return <a href={path} {...propsWithoutTo} />;
  }

  return <LinkRouter {...props} />;
};

Link.propTypes = PropTypes.any;
