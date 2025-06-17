import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import ReviewCard from 'app/components/review-card';
import ReviewsSlider from 'app/components/reviews-slider';
import { appSizeType } from 'app/pages/app/app.types';

import ProfileTitle from '../profile-title';

import './top-reviews.styl';

@connect((state) => ({
  size: state.app.size,
  topReviews: state.profile.topReviews,
}))
export default class TopReviews extends Component {
  static propTypes = {
    size: appSizeType.isRequired,
    topReviews: PropTypes.shape().isRequired,
  };

  render() {
    const { size, topReviews } = this.props;
    const { count, results } = topReviews;

    if (!count) {
      return null;
    }

    return (
      <div className="top-reviews">
        <ProfileTitle id="profile.overview_top_reviews_title" type="large" centred />
        {results.length > 1 ? (
          <ReviewsSlider reviews={results} size={size} />
        ) : (
          <ReviewCard
            className="top-reviews__review top-reviews__review_grow"
            review={results[0]}
            kind="common"
            fullReviewLink
            textLines={3}
            showGameInfo
            showUserInfo
            showComments={false}
            showMenu={false}
          />
        )}
      </div>
    );
  }
}
