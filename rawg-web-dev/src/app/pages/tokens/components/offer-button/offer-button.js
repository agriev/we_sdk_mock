import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import SVGInline from 'react-svg-inline';

import giftIcon from 'assets/icons/gift.svg';

import Button from 'app/ui/button';

import './offer-button.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  size: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
  size: '',
};

const OfferButton = (props) => {
  const { className, size, onClick } = props;
  return (
    <Button
      className={['offer-button', size.length > 0 && `offer-button_${size}`, className].join(' ')}
      kind="fill"
      size="small"
      onClick={onClick}
    >
      <SVGInline svg={giftIcon} />
      <FormattedMessage id="tokens.offers_get" />
    </Button>
  );
};

OfferButton.propTypes = componentPropertyTypes;

OfferButton.defaultProps = defaultProps;

export default OfferButton;
