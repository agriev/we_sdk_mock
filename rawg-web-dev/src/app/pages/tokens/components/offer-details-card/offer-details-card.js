import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import { FormattedMessage } from 'react-intl';

import getAppContainer from 'tools/get-app-container';

import OfferButton from '../offer-button';
import OfferPrice from '../offer-price';
import OfferConfirm from '../offers/components/offer-confirm';
import OfferDetailsGallery from './components/offer-details-gallery/offer-details-gallery';

import './offer-details-card.styl';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  className: PropTypes.string,
  sliderRerender: PropTypes.func.isRequired,
  offer: PropTypes.shape().isRequired,
};

const defaultProps = {
  className: '',
};

class OfferDetailsCardComponent extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {
      isConfirmPurchase: false,
    };
  }

  componentDidMount() {
    getAppContainer().style.overflow = 'hidden';
  }

  componentWillUnmount() {
    getAppContainer().style.overflow = '';
  }

  getButtonHandler = () => {
    this.setState({ isConfirmPurchase: true });
    // eslint-disable-next-line no-console
    this.props.sliderRerender();
  };

  cancelButtonHandler = () => {
    this.setState({ isConfirmPurchase: false });
    this.props.sliderRerender();
  };

  render() {
    const { className, offer } = this.props;
    const { images, name, price, category = 'Entertiment' } = offer;
    const { isConfirmPurchase } = this.state;

    return (
      <div className={['offer-details-card', className].join(' ')}>
        <OfferDetailsGallery images={images.results} className="offer-details-card__gallery" />
        <div className="offer-details-card__info-wrap">
          <div className="offer-details-card__info__category">{category}</div>
          <div className="offer-details-card__info__name">{name}</div>
          {isConfirmPurchase ? (
            <OfferConfirm cancelHandler={this.cancelButtonHandler} />
          ) : (
            <div className="offer-details-card__buttons-wrap">
              <OfferButton size="medium" className="offer-details-card__button" onClick={this.getButtonHandler} />
              <OfferPrice price={price} size="medium" />
            </div>
          )}
          {/* <OfferOwned /> */}
        </div>
        <div className="offer-details-card__description">
          <div className="offer-details-card__description__title">
            <FormattedMessage id="tokens.offerDetails_about" />
          </div>
          <div className="offer-details-card__description__text">
            Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa.
            Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis,
            ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Lorem ipsum dolor sit
            amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque
            penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec,
            pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Lorem ipsum dolor sit amet,
            consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus
            et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu,
            pretium quis, sem. Nulla consequat massa quis enim.
          </div>
        </div>
      </div>
    );
  }
}

OfferDetailsCardComponent.propTypes = componentPropertyTypes;
OfferDetailsCardComponent.defaultProps = defaultProps;

const OfferDetailsCard = hoc(OfferDetailsCardComponent);

export default OfferDetailsCard;
