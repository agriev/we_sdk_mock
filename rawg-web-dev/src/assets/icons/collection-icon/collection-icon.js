import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './collection-icon.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
};

const defaultProps = {
  className: '',
};

const CollectionIcon = (props) => {
  let { className } = props;

  className = classnames('collection-icon', {
    [className]: className,
  });

  return <div className={className} />;
};

CollectionIcon.propTypes = componentPropertyTypes;
CollectionIcon.defaultProps = defaultProps;

export default CollectionIcon;
