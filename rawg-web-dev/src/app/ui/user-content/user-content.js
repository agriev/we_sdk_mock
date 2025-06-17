/* eslint-disable react/no-danger */

import React from 'react';
import PropTypes from 'prop-types';

export const componentPropTypes = {
  content: PropTypes.string.isRequired,
  className: PropTypes.string,
  itemProp: PropTypes.string,
};

const defaultProps = {
  className: '',
  itemProp: undefined,
};

const prepareContent = (content = '') =>
  content.replace(/(<br>){3,}/g, '<br>').replace('<a href', "<a target='_blank' href");

const UserContent = ({ content, className, itemProp }) => (
  <div
    className={className}
    itemProp={itemProp}
    dangerouslySetInnerHTML={{
      __html: prepareContent(content),
    }}
  />
);

UserContent.propTypes = componentPropTypes;
UserContent.defaultProps = defaultProps;

export default UserContent;
