import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

export const componentPropTypes = {
  image: PropTypes.shape({
    simple: PropTypes.string.isRequired,
    retina: PropTypes.string.isRequired,
  }).isRequired,
  className: PropTypes.string,
  title: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  visible: PropTypes.bool,
};

const defaultProps = {
  className: '',
  visible: true,
};

const ResponsiveImage = (props) => {
  const { image, title, alt, className, visible, ...otherProperties } = props;
  const { simple, retina } = image;
  const imageClassName = cn('responsive-image', className);

  return (
    <img
      className={imageClassName}
      srcSet={visible ? `${retina} 2x, ${simple} 1x` : ''}
      src={visible ? simple : ''}
      title={title}
      alt={alt}
      {...otherProperties}
    />
  );
};

ResponsiveImage.propTypes = componentPropTypes;
ResponsiveImage.defaultProps = defaultProps;

export default ResponsiveImage;
