import React from 'react';
import PropTypes from 'prop-types';

import resize from 'tools/img/resize';

import OfferButton from '../../../offer-button';
import OfferPrice from '../../../offer-price';

import './offer-card.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  name: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  image: PropTypes.string,
  offerDetailsOpen: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
  image: '',
};

const OfferCard = ({ className, name, price, image, offerDetailsOpen }) => {
  const imageStyle = {
    backgroundImage: image
      ? `url('${resize(640, image)}')`
      : 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(32,32,32,1.0))',
  };

  return (
    <div className={['tokens__offer-card', className].join(' ')}>
      <div className="tokens__offer-card__img" style={imageStyle} />
      <h3 className="tokens__offer-card__name">{name}</h3>
      <OfferPrice price={price} className="tokens__offer-card__price" />
      <OfferButton className="tokens__offer-card__button" onClick={offerDetailsOpen} />
    </div>
  );
};

OfferCard.propTypes = componentPropertyTypes;

OfferCard.defaultProps = defaultProps;

export default OfferCard;
