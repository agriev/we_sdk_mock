import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SVGInline from 'react-svg-inline';

import closeIcon from 'assets/icons/close-dark.svg';

import Slider from 'app/ui/slider';
import SliderArrow from 'app/ui/slider-arrow';

import { offers as offersType } from 'app/pages/tokens/tokens.types';

import OfferDetailsCard from '../offer-details-card/offer-details-card';

import './offer-details.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  offers: offersType.isRequired,
  visibility: PropTypes.bool,
  offerDetailsClose: PropTypes.func.isRequired,
  offerIndex: PropTypes.number.isRequired,
};

const defaultProps = {
  className: '',
  visibility: false,
};

class OfferDetails extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {};
  }

  // shouldComponentUpdate() {}

  sliderRerender = () => {
    this.sliderRef.forceUpdate();
  };

  render() {
    const { className, offers, visibility, offerDetailsClose, offerIndex } = this.props;

    if (!offers || offers.count === 0 || !visibility) return null;

    return (
      <div className={['offer-details', className].join(' ')}>
        <div className="offer-details__container">
          <div className="offer-details__close" onClick={offerDetailsClose} role="button" tabIndex={0}>
            <SVGInline svg={closeIcon} />
          </div>
          <Slider
            ref={(slider) => {
              this.sliderRef = slider;
            }}
            slidesToScroll={1}
            centerPadding="0"
            infinite
            swipeToSlide
            arrows
            adaptiveHeight
            nextArrow={<SliderArrow arrowClassName="offer-details__slider-arrow" direction="next" />}
            prevArrow={<SliderArrow arrowClassName="offer-details__slider-arrow" direction="prev" />}
            initialSlide={offerIndex}
          >
            {offers.results.map((offer) => (
              <OfferDetailsCard offer={offer} key={offer.id} sliderRerender={this.sliderRerender} />
            ))}
          </Slider>
        </div>
      </div>
    );
  }
}

OfferDetails.propTypes = componentPropertyTypes;

OfferDetails.defaultProps = defaultProps;

export default OfferDetails;
