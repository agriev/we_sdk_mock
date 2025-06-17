import React from 'react';
import PropTypes from 'prop-types';

import appHelper from 'app/pages/app/app.helper';
import Slider from 'app/ui/slider';
import SliderArrow from 'app/ui/slider-arrow';
import ReviewCard from 'app/components/review-card';

import './reviews-slider.styl';

const propTypes = {
  size: PropTypes.string.isRequired,
  reviews: PropTypes.arrayOf(PropTypes.shape),
  slidesToScroll: PropTypes.number,
};

const defaultProps = {
  reviews: [],
  slidesToScroll: 1,
};

const renderReview = (review, className = '') => (
  <ReviewCard
    className={className}
    kind="slider"
    review={review}
    more={false}
    showGameInfo
    showUserInfo
    showComments={false}
    showMenu={false}
    fullReviewLink
    textLines={6}
  />
);

const ReviewsSlider = ({ reviews, size, slidesToScroll }) => (
  <Slider
    className="reviews-slider"
    arrows={appHelper.isDesktopSize({ size }) && reviews.length > 2}
    nextArrow={<SliderArrow direction="next" />}
    prevArrow={<SliderArrow direction="prev" />}
    dots={appHelper.isPhoneSize({ size })}
    slidesToScroll={slidesToScroll}
    infinite={appHelper.isDesktopSize({ size })}
    variableWidth
    swipeToSlide
  >
    {reviews.map((review) => (
      <div className="reviews-slider__slide" key={review.id}>
        {renderReview(review, 'reviews-slider__slide-card')}
      </div>
    ))}
  </Slider>
);

ReviewsSlider.propTypes = propTypes;
ReviewsSlider.defaultProps = defaultProps;

export default ReviewsSlider;
