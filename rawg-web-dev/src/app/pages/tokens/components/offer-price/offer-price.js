import React from 'react';
import PropTypes from 'prop-types';

import './offer-price.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  price: PropTypes.number.isRequired,
  size: PropTypes.string,
};

const defaultProps = {
  className: '',
  size: '',
};

const OfferPrice = ({ className, price, size }) => {
  return <div className={['offer-price', size.length > 0 && `offer-price_${size}`, className].join(' ')}>{price}</div>;
};

OfferPrice.propTypes = componentPropertyTypes;

OfferPrice.defaultProps = defaultProps;

export default OfferPrice;
