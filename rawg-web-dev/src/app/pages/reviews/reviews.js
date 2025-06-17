import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import cn from 'classnames';

import prepare from 'tools/hocs/prepare';
import getPagesCount from 'tools/get-pages-count';
import appHelper from 'app/pages/app/app.helper';
import getUrlWidthQuery from 'tools/get-url-with-query';
import { pageView } from 'scripts/analytics-helper';

import DiscoverPage from 'app/ui/discover-page';
import Heading from 'app/ui/heading';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import ReviewsList from 'app/components/reviews-list';
import ModeSelector from 'app/components/mode-selector';

import { modeSelectorType } from 'app/components/mode-selector/mode-selector.helper';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import { loadDiscoverFollowings } from 'app/pages/discover/discover.actions';
import denormalizeArr from 'tools/redux/denormalize-array';

import './reviews.styl';

import { setReviewsDisplayMode, loadPopularReviews, loadNewReviews, REVIEWS_PAGE_SIZE } from './reviews.actions';

@hot
@prepare(async ({ store, location }) => {
  const page = parseInt(location.query.page, 10) || 1;

  await Promise.all([
    store.dispatch(setReviewsDisplayMode()),
    store.dispatch(
      loadPopularReviews({
        page: 1,
      }),
    ),
    store.dispatch(
      loadNewReviews({
        page,
      }),
    ),
    store.dispatch(loadDiscoverFollowings()),
  ]);
})
@connect((state) => ({
  reviewsNew: denormalizeArr(state, 'reviews.new.items', 'REVIEW_ARRAY'),
  reviewsNewData: state.reviews.new,
  reviewsPopular: denormalizeArr(state, 'reviews.popular.items', 'REVIEW_ARRAY'),
  reviewsPopularData: state.reviews.popular,
  displayMode: state.reviews.displayMode,
  appSize: state.app.size,
}))
@injectIntl
class Reviews extends Component {
  static propTypes = {
    className: PropTypes.string,
    intl: intlShape.isRequired,
    dispatch: PropTypes.func.isRequired,
    location: locationShape.isRequired,
    appSize: PropTypes.string.isRequired,
    displayMode: modeSelectorType.isRequired,

    reviewsNew: PropTypes.arrayOf(PropTypes.object).isRequired,
    reviewsNewData: PropTypes.shape().isRequired,
    reviewsPopularData: PropTypes.shape().isRequired,
  };

  static defaultProps = {
    className: '',
  };

  constructor(props) {
    super(props);

    this.state = {};
  }

  onChangeDisplayMode = ({ mode }) => () => {
    const { dispatch } = this.props;

    dispatch(setReviewsDisplayMode(mode));
  };

  load = async ({ page } = {}) => {
    const { dispatch, reviewsNewData, location } = this.props;
    const { next } = reviewsNewData;
    const nextPage = (typeof page === 'number' && page) || next;

    await dispatch(
      loadNewReviews({
        page: nextPage,
      }),
    );

    if (nextPage > 1) {
      pageView(getUrlWidthQuery(location, { page: nextPage }));
    }
  };

  loadBest = async ({ page } = {}) => {
    const { dispatch, reviewsPopularData, location } = this.props;
    const { next } = reviewsPopularData;
    const nextPage = (typeof page === 'number' && page) || next;

    await dispatch(
      loadPopularReviews({
        page: nextPage,
      }),
    );

    if (nextPage > 1) {
      pageView(getUrlWidthQuery(location, { page: nextPage }));
    }
  };

  render() {
    const {
      className,
      intl,
      reviewsNew,
      reviewsNewData,
      location: { pathname },
      appSize,
      displayMode,
    } = this.props;

    const isPhoneSize = appHelper.isPhoneSize({ size: appSize });
    const heading = <SimpleIntlMessage id="reviews.title" />;

    const currentReviews = reviewsNew;
    const currentReviewsData = reviewsNewData;
    const { count, next, loading } = currentReviewsData;

    return (
      <DiscoverPage
        className="reviews__page"
        pageProperties={{
          helmet: {
            title: intl.formatMessage({
              id: 'reviews.best_title',
            }),
          },
          sidebarProperties: {
            needControls: true,
          },
        }}
        pathname={pathname}
        isPhoneSize={isPhoneSize}
        heading={!isPhoneSize && <Heading rank={1}>{heading}</Heading>}
      >
        <div className={cn('reviews', className)}>
          <div className="reviews__settings">
            <ModeSelector
              className="reviews__settings__mode-select"
              displayMode={displayMode}
              setModeHandler={this.onChangeDisplayMode}
            />
          </div>

          <ReviewsList
            displayMode={displayMode}
            appSize={appSize}
            items={currentReviews}
            load={this.load}
            loading={loading}
            count={count}
            next={next}
            pages={getPagesCount(count, REVIEWS_PAGE_SIZE)}
          />
        </div>
      </DiscoverPage>
    );
  }
}

export default Reviews;
