/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';
import { push } from 'react-router-redux';

import debounce from 'lodash/debounce';

import intlShape from 'tools/prop-types/intl-shape';

import checkLogin from 'tools/check-login';

import './game-rating-distribution.styl';

import RatingDistribution from 'app/ui/rating-distribution';
import { updateGameReviews } from 'app/pages/game/game.actions';
import { createReview, editReview } from 'app/components/review-form/review-form.actions';
import { user_review as userReviewType } from 'app/pages/game/game.types';
import paths from 'config/paths';

@injectIntl
export default class GameRatingDistribution extends React.PureComponent {
  static propTypes = {
    allRatings: PropTypes.arrayOf(PropTypes.object),
    ratings: PropTypes.arrayOf(PropTypes.object),
    id: PropTypes.number,
    slug: PropTypes.string,
    dispatch: PropTypes.func.isRequired,
    isStat: PropTypes.bool,
    user_review: userReviewType,
    intl: intlShape,
  };

  static defaultProps = {
    id: null,
    slug: null,
    allRatings: [],
    ratings: [],
    isStat: true,
    user_review: null,
  };

  constructor(...arguments_) {
    super(...arguments_);

    const { user_review } = this.props;

    this.state = {
      userReview: user_review,
    };
  }

  static getDerivedStateFromProps(props, state) {
    const yourReviewAdded = props.user_review && !state.userReview;
    const yourReviewRemove = !props.user_review && state.userReview;

    if (yourReviewAdded || yourReviewRemove) {
      return {
        userReview: props.user_review,
      };
    }

    return null;
  }

  changeRating = (rating) => {
    const { dispatch, id, slug } = this.props;
    const { userReview } = this.state;

    if (userReview && userReview.rating === rating.id) {
      dispatch(push(paths.reviewEdit(userReview.id)));
    } else {
      checkLogin(dispatch, async () => {
        if (userReview) {
          this.setState({ userReview: { id: userReview.id, rating: rating.id } });

          await dispatch(
            editReview({
              id: userReview.id,
              rating: rating.id,
              redirect: false,
              isBack: false,
            }),
          );
        } else {
          const review = await dispatch(
            createReview({
              id,
              slug,
              rating: rating.id,
              redirect: false,
              isBack: false,
            }),
          );

          this.setState({ userReview: review });
        }

        dispatch(updateGameReviews(id));
      });
    }
  };

  /* eslint-disable-next-line react/sort-comp */
  changeRatingDebounced = debounce(this.changeRating, 500);

  render() {
    const { intl, allRatings, ratings, isStat } = this.props;
    const { userReview } = this.state;

    return (
      <>
        {ratings.length > 0 && (
          <p className="game-rating-distribution__click-to-rate">{intl.formatMessage({ id: 'game.click_to_rate' })}</p>
        )}
        <RatingDistribution
          className="game-rating-distribution"
          allRatings={allRatings}
          ratings={ratings}
          onRatingClick={this.changeRatingDebounced}
          user_review={userReview}
          isStat={isStat}
        />
      </>
    );
  }
}
