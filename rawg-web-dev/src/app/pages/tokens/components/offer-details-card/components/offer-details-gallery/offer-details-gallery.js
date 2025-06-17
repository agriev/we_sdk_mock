import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import resize from 'tools/img/resize';

import './offer-details-gallery.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  images: PropTypes.arrayOf(PropTypes.string).isRequired,
};

const defaultProps = {
  className: '',
};

class OfferDetailsGallery extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {
      imageIndex: 0,
    };
  }

  render() {
    const { className, images } = this.props;
    const { imageIndex } = this.state;

    const imageStyle = (image) => ({
      backgroundImage: image
        ? `url('${resize(640, image)}')`
        : 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(32,32,32,1.0))',
    });

    return (
      <div className={['offer-details-gallery', className].join(' ')}>
        <div className="offer-details-gallery__image_main" style={imageStyle(images[imageIndex])} />
        {images.slice(0, 4).map((image, index /* eslint-disable react/no-array-index-key */) => (
          <div
            role="button"
            key={image + index}
            tabIndex={0}
            onClick={() => imageIndex !== index && this.setState({ imageIndex: index })}
            className={cn('offer-details-gallery__image', {
              'offer-details-gallery__image_active': index === imageIndex,
            })}
            style={imageStyle(image)}
          />
        ))}
        {/*  placeholders for flexbox justify-content */}
        <div className="offer-details-gallery__placeholder" />
        <div className="offer-details-gallery__placeholder" />
        <div className="offer-details-gallery__placeholder" />
      </div>
    );
  }
}

OfferDetailsGallery.defaultProps = defaultProps;

export default OfferDetailsGallery;
