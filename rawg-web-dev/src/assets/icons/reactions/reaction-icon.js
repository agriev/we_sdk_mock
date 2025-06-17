import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import './reaction-icon.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  slug: PropTypes.string,
};

const defaultProps = {
  className: '',
  slug: '',
};

const ReactionIcon = ({ className, slug }) => (
  <div className={cn('reaction-icon', `reaction-icon-${slug}`, className)} />
);

ReactionIcon.propTypes = componentPropertyTypes;
ReactionIcon.defaultProps = defaultProps;

export default ReactionIcon;
