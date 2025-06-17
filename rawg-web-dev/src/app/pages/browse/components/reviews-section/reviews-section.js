import React from 'react';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';

import len from 'tools/array/len';
import paths from 'config/paths';

import intlShape from 'tools/prop-types/intl-shape';

import ReviewCard from 'app/components/review-card';
import SectionWrapper from '../section-wrapper';

const propTypes = {
  reviews: PropTypes.arrayOf(PropTypes.object).isRequired,
  count: PropTypes.number.isRequired,
  intl: intlShape.isRequired,
  appSize: PropTypes.string.isRequired,
};

const ReviewsSectionComponent = (props) => {
  const { reviews, count, appSize, intl } = props;

  if (len(reviews) === 0) return null;

  return (
    <SectionWrapper
      section={{
        name: intl.formatMessage({ id: 'discover.reviews' }),
        path: paths.reviewsBest,
        items: reviews
          .slice(0, 8)
          .map((item) => (
            <ReviewCard
              review={item}
              kind="common"
              fullReviewLink
              textLines={3}
              showGameInfo
              showUserInfo
              showComments={false}
              showMenu={false}
            />
          )),
        count,
      }}
      appSize={appSize}
    />
  );
};

ReviewsSectionComponent.propTypes = propTypes;

const ReviewsSection = injectIntl(ReviewsSectionComponent);

export default ReviewsSection;
