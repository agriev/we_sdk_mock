import React, { Component } from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';

import prepare from 'tools/hocs/prepare';
import appHelper from 'app/pages/app/app.helper';

import { loadBrowseFull } from 'app/pages/browse/browse.actions';
import { loadPopularCollections } from 'app/pages/collections/collections.actions';

import DiscoverPage from 'app/ui/discover-page';
import Heading from 'app/ui/heading';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import BrowseSection from 'app/pages/browse/components/browse-section';
import CollectionsSection from 'app/pages/browse/components/collections-section';
import ReviewsSection from 'app/pages/browse/components/reviews-section';

import './browse.styl';

import showcaseTypes from 'app/pages/browse/browse.types';
import { appSizeType } from 'app/pages/app/app.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import { loadDiscoverFollowings } from 'app/pages/discover/discover.actions';
import { loadPopularReviews } from 'app/pages/reviews/reviews.actions';
import denormalizeArr from 'tools/redux/denormalize-array';

@prepare(async ({ store }) => {
  await Promise.all([
    store.dispatch(loadBrowseFull()),
    store.dispatch(loadPopularCollections()),
    store.dispatch(loadPopularReviews()),
    store.dispatch(loadDiscoverFollowings()),
  ]);
})
@injectIntl
@connect((state) => ({
  appSize: state.app.size,
  fullCase: state.browse.fullCase,
  collections: state.collections.popular,
  reviews: denormalizeArr(state, 'reviews.popular.items', 'REVIEW_ARRAY'),
  reviewsCount: state.reviews.popular.count,
}))
export default class Browse extends Component {
  static propTypes = {
    fullCase: showcaseTypes.isRequired,
    appSize: appSizeType.isRequired,
    intl: intlShape.isRequired,
    location: locationShape.isRequired,
    collections: PropTypes.shape({}).isRequired,
    reviews: PropTypes.arrayOf(PropTypes.object).isRequired,
    reviewsCount: PropTypes.number.isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  renderSections() {
    const { fullCase, appSize, dispatch } = this.props;

    return fullCase.items.map((item) => (
      <BrowseSection section={item} appSize={appSize} key={item.name} dispatch={dispatch} />
    ));
  }

  renderCollections() {
    const { collections, appSize, dispatch } = this.props;

    return <CollectionsSection section={collections} appSize={appSize} dispatch={dispatch} />;
  }

  renderReviews() {
    const { reviews, reviewsCount, appSize } = this.props;

    return <ReviewsSection reviews={reviews} count={reviewsCount} appSize={appSize} />;
  }

  render() {
    const {
      appSize,
      location: { pathname },
      intl,
    } = this.props;
    const isPhoneSize = appHelper.isPhoneSize({ size: appSize });
    const heading = <SimpleIntlMessage id="catalog.browse_title" />;

    return (
      <DiscoverPage
        pageProperties={{
          helmet: {
            title: intl.formatMessage({ id: 'catalog.browse_meta_title' }),
            description: intl.formatMessage({ id: 'catalog.browse_meta_description' }),
          },
          sidebarProperties: {
            needControls: true,
          },
        }}
        pathname={pathname}
        isPhoneSize={isPhoneSize}
        heading={isPhoneSize && heading}
      >
        <div className="browse">
          {!isPhoneSize && (
            <Heading rank={1} withMobileOffset>
              {heading}
            </Heading>
          )}
          {this.renderSections()}
          {this.renderCollections()}
          {this.renderReviews()}
        </div>
      </DiscoverPage>
    );
  }
}
