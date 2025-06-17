import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { compose, withProps } from 'recompose';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';
import { Element } from 'react-scroll';

import sliceToColumns from 'tools/slice-to-columns';
import Scroller from 'app/ui/scroller';
import helper from 'app/pages/app/app.helper';

import { offers as offersType, status as statusType, STATUS_ACTIVE } from 'app/pages/tokens/tokens.types';

import TokensHeader from 'app/pages/tokens/components/tokens-header';

import OfferCard from './components/offer-card';
import OfferDetails from '../offer-details';

import './offers.styl';

// temp data
import tempData from './offers-temp-data';

const hoc = compose(
  hot(module),
  connect((state) => ({
    size: state.app.size,
    status: state.tokensDashboard.status,
    offers: state.tokensDashboardData.offers,
  })),
  withProps(({ setActiveSection }) => ({
    activateSection: () => {
      setActiveSection('offers');
    },
  })),
);

const componentPropertyTypes = {
  offers: offersType,
  className: PropTypes.string,
  size: PropTypes.string.isRequired,
  status: statusType.isRequired,
  activateSection: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
  offers: [],
};

class TokensOffersComponent extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {
      detailsVisivility: false,
      offerIndex: 0,
    };
  }

  offerDetailsOpen = (index) => {
    this.setState({ detailsVisivility: true, offerIndex: index });
  };

  offerDetailsClose = () => {
    this.setState({ detailsVisivility: false });
  };

  tokensOffersColumns = (offers) => {
    const columns = sliceToColumns(offers);

    return (
      <div className="tokens__offers__cols-wrap">
        <div className="tokens__offers__col1">
          {columns.firstColumn.map((offer, index) => (
            <OfferCard
              key={offer.id}
              name={offer.name}
              price={offer.price}
              image={offer.image}
              offerDetailsOpen={() => this.offerDetailsOpen(index)}
            />
          ))}
        </div>
        <div className="tokens__offers__col2">
          {columns.secondColumn.map((offer, index) => (
            <OfferCard
              key={offer.id}
              name={offer.name}
              price={offer.price}
              image={offer.image}
              offerDetailsOpen={() => this.offerDetailsOpen(index + 1)}
            />
          ))}
        </div>
      </div>
    );
  };

  render() {
    const { className, size, offers, status, activateSection } = this.props;

    const { detailsVisivility, offerIndex } = this.state;

    if (offers.length === 0) return null;

    const position = status === STATUS_ACTIVE ? 4 : '🎁';
    const headerClassName = status !== STATUS_ACTIVE ? 'tokens-header_max-opacity' : '';

    return (
      <div
        className={cn('tokens__offers', className, {
          tokens__offers_finished: status !== STATUS_ACTIVE,
        })}
      >
        <Scroller onReach={{ top: activateSection, bottom: activateSection, offset: 100 }} />
        <Element name="tokens.offers" />
        <TokensHeader className={headerClassName} position={position} title="tokens.offers_title" />
        <div className="tokens__offers-wrap">
          {helper.isDesktopSize({ size })
            ? tempData.results.map((offer, index) => (
                <OfferCard
                  key={offer.id}
                  name={offer.name}
                  price={offer.price}
                  image={offer.image}
                  slug={offer.slug}
                  offerDetailsOpen={() => this.offerDetailsOpen(index)}
                />
              ))
            : this.tokensOffersColumns(offers.results)}
          <div className="tokens__offers__card-placeholder" />
          <div className="tokens__offers__card-placeholder" />
          <div className="tokens__offers__card-placeholder" />
          <Scroller onReach={{ top: activateSection, bottom: activateSection, offset: 100 }} />
        </div>
        <OfferDetails
          offers={tempData}
          visibility={detailsVisivility}
          offerDetailsClose={this.offerDetailsClose}
          offerIndex={offerIndex}
        />
      </div>
    );
  }
}

TokensOffersComponent.propTypes = componentPropertyTypes;
TokensOffersComponent.defaultProps = defaultProps;

const TokensOffers = hoc(TokensOffersComponent);

export default TokensOffers;
