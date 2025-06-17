import React from 'react';
import PropTypes from 'prop-types';

import ListLoader from 'app/ui/list-loader';
import NoResults from 'app/pages/games/components/no-results';
import { appSizeType } from 'app/pages/app/app.types';
import appHelper from 'app/pages/app/app.helper';
import ReviewCard from 'app/components/review-card/review-card';
import DiscoverColumns from 'app/components/discover-columns';
import reviewType from 'app/pages/review/review.types';

import getPagesCount from 'tools/get-pages-count';

import './reviews-list.styl';

const propTypes = {
  reviews: PropTypes.arrayOf(reviewType).isRequired,
  count: PropTypes.number.isRequired,
  next: PropTypes.number,
  loading: PropTypes.bool.isRequired,
  loaded: PropTypes.bool.isRequired,
  load: PropTypes.func,
  appSize: appSizeType.isRequired,
  pageSize: PropTypes.number.isRequired,
  beautifyLines: PropTypes.bool,
};

const defaultProps = {
  beautifyLines: undefined,
  load: undefined,
};

const DiscoverMainReviewsList = ({ reviews, count, next, loading, loaded, load, appSize, pageSize, beautifyLines }) => {
  const showColumns = !appHelper.isPhoneSize(appSize);
  const showListMedium = appHelper.isPhoneSize(appSize);

  const renderReview = (review) => (
    <ReviewCard
      className="discover-main__review-card"
      key={review.id}
      review={review}
      more={false}
      showGameInfo
      showUserInfo
      showComments={false}
      showMenu={false}
      fullReviewLink
    />
  );

  return (
    <ListLoader
      className="discover-main__reviews-list"
      load={load}
      count={count}
      next={next}
      loading={loading}
      pages={getPagesCount(count, pageSize)}
      showSeoPagination={false}
    >
      {loaded && count === 0 && <NoResults addClearFilterLink={false} />}
      {count > 0 && showColumns && (
        <DiscoverColumns
          containerWidth={0}
          itemsCount={count}
          itemsPerPage={pageSize}
          beautifyLines={beautifyLines}
          items={reviews}
          renderItem={renderReview}
        />
      )}
      {count > 0 && showListMedium && reviews.map(renderReview)}
    </ListLoader>
  );
};

DiscoverMainReviewsList.propTypes = propTypes;
DiscoverMainReviewsList.defaultProps = defaultProps;

export default DiscoverMainReviewsList;
