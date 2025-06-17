import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { onlyUpdateForKeys } from 'recompose';
import { Link } from 'app/components/link';

import appHelper from 'app/pages/app/app.helper';
import ReviewsSlider from 'app/components/reviews-slider';
import ReviewCard from 'app/components/review-card';
import Heading from 'app/ui/heading';
import LoadMore from 'app/ui/load-more';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import paths from 'config/paths';

import './reviews.styl';

import { loadPopularReviews } from 'app/pages/reviews/reviews.actions';
import denormalizeArr from 'tools/redux/denormalize-array';

const connector = connect((state) => ({
  size: state.app.size,
  reviews: denormalizeArr(state, 'reviews.popular.items', 'REVIEW_ARRAY'),
  reviewsData: state.reviews.popular,
}));

const updater = onlyUpdateForKeys(['reviews', 'size']);

const componentPropertyTypes = {
  reviews: PropTypes.arrayOf(PropTypes.object).isRequired,
  reviewsData: PropTypes.shape().isRequired,
  size: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
  isSeo: PropTypes.bool,
};

const componentDefaultProperties = {
  isSeo: false,
};

const renderReview = (review, size, className = '') => (
  <ReviewCard
    className={className}
    kind={appHelper.isPhoneSize({ size }) ? 'slider' : undefined}
    review={review}
    more={false}
    showGameInfo
    showUserInfo
    showComments={false}
    showMenu={false}
    fullReviewLink
    key={review.id}
  />
);

const ShowcaseReviews = ({ reviews, reviewsData, size, dispatch, isSeo }) => {
  const { next, count, loading } = reviewsData;

  if (!reviews || reviews.length === 0) return null;

  const load = () => dispatch(loadPopularReviews({ page: next }));

  return (
    <div className="showcase-reviews">
      <Heading rank={2} centred>
        {isSeo ? (
          <Link to={paths.reviewsBest} href={paths.reviewsBest}>
            <SimpleIntlMessage id="showcase.reviews_title" />
          </Link>
        ) : (
          <SimpleIntlMessage id="showcase.reviews_title" />
        )}
      </Heading>
      {appHelper.isDesktopSize(size) ? (
        <LoadMore appSize={size} load={load} count={count} next={next} loading={loading}>
          <div className="showcase-reviews__columns">
            <div className="showcase-reviews__column">
              {reviews
                .filter((review, index) => index % 2 === 0)
                .map((review) => renderReview(review, size, 'showcase-reviews__review'))}
            </div>
            <div className="showcase-reviews__column">
              {reviews
                .filter((review, index) => index % 2 !== 0)
                .map((review) => renderReview(review, size, 'showcase-reviews__review'))}
            </div>
          </div>
        </LoadMore>
      ) : (
        <ReviewsSlider slidesToScroll={appHelper.isDesktopSize({ size }) ? 2 : 1} reviews={reviews} size={size} />
      )}
    </div>
  );
};

ShowcaseReviews.propTypes = componentPropertyTypes;
ShowcaseReviews.defaultProps = componentDefaultProperties;

export default connector(updater(ShowcaseReviews));
