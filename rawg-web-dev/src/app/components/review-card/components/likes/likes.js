/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { injectIntl } from 'react-intl';

import './likes.styl';

import checkLogin from 'tools/check-login';
import currentUserType from 'app/components/current-user/current-user.types';
import intlShape from 'tools/prop-types/intl-shape';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import { like, dislike, removeLike } from 'app/components/review-card/review-card.actions';

const propTypes = {
  currentUser: currentUserType.isRequired,
  user: PropTypes.shape().isRequired,
  review: PropTypes.shape().isRequired,
  intl: intlShape.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const defaultProps = {};

@injectIntl
class ReviewCardLikes extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    const { review = {} } = props;
    const { likes_positive = 0, likes_count = 0, likes_rating = 0, user_like } = review;

    this.state = {
      id: review.id,
      likesPositive: likes_positive,
      likesCount: likes_count,
      likesRating: likes_rating,
      userLike: user_like,
    };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.review.id && !state.id) {
      const { id, likes_positive = 0, likes_count = 0, likes_rating = 0, user_like } = props.review;

      return {
        id,
        likesPositive: likes_positive,
        likesCount: likes_count,
        likesRating: likes_rating,
        userLike: user_like,
      };
    }

    return null;
  }

  toggleLike = ({ positive }) => {
    /* eslint-disable sonarjs/cognitive-complexity */
    const { dispatch, review } = this.props;
    const { id } = review;
    let { userLike } = this.state;
    let likesPositiveNumber;
    let likesCountNumber;
    let likesRatingNumber;

    checkLogin(dispatch, () => {
      if ((positive && userLike === 'positive') || (!positive && userLike === 'negative')) {
        dispatch(removeLike(id));

        likesPositiveNumber = positive ? -1 : 0;
        likesCountNumber = -1;
        likesRatingNumber = positive ? -1 : 1;
        userLike = '';
      } else {
        /* eslint-disable no-nested-ternary */

        dispatch(positive ? like(id) : dislike(id));

        likesPositiveNumber = userLike ? (positive && userLike === 'negative' ? 1 : -1) : positive ? 1 : 0;
        likesCountNumber = userLike ? 0 : 1;
        likesRatingNumber = userLike ? (positive && userLike === 'negative' ? 2 : -2) : positive ? 1 : -1;
        userLike = positive ? 'positive' : 'negative';
      }

      this.setState((state) => ({
        likesPositive: state.likesPositive + likesPositiveNumber,
        likesCount: state.likesCount + likesCountNumber,
        likesRating: state.likesRating + likesRatingNumber,
        userLike,
      }));
    });
  };

  renderReviewLikers() {
    const { likesCount, likesPositive } = this.state;

    if (likesCount && !likesPositive) {
      return <SimpleIntlMessage id="shared.review_nobody_likes" />;
    }

    if (likesPositive === likesCount) {
      return (
        <SimpleIntlMessage
          id="shared.review_only_likes"
          values={{
            count: likesCount,
          }}
        />
      );
    }

    return (
      <SimpleIntlMessage
        id="shared.review_likes"
        values={{
          count_1: likesPositive,
          count_2: likesCount,
        }}
      />
    );
  }

  render() {
    const { currentUser, user, intl } = this.props;
    const { likesCount, likesRating, userLike } = this.state;

    return (
      <div className="review-card__likes">
        {likesCount > 0 && <div className="review-card__likes-text">{this.renderReviewLikers()}</div>}
        {currentUser.id !== user.id && (
          <div className="review-card__likes-buttons">
            <div
              className={cn(
                'review-card__likes-button',
                'review-card__likes-button_positive',
                userLike === 'positive' ? 'review-card__likes-button_active' : '',
              )}
              onClick={() => this.toggleLike({ positive: true })}
              role="button"
              tabIndex={0}
              title={intl.formatMessage({
                id: `shared.review_${userLike === 'positive' ? 'remove_like' : 'like'}`,
              })}
            >
              <div
                className={cn(
                  'review-card__icon',
                  'review-card__icon_positive',
                  userLike === 'positive' ? 'review-card__icon_positive__up-active' : 'review-card__icon__up',
                )}
              />
            </div>
            <div
              className={cn('review-card__likes-rating', {
                'review-card__likes-rating_positive': likesRating > 0,
                'review-card__likes-rating_negative': likesRating < 0,
              })}
            >
              {likesRating > 0 ? '+' : ''}
              {likesRating}
            </div>
            <div
              className={cn(
                'review-card__likes-button',
                'review-card__likes-button_negative',
                userLike === 'negative' ? 'review-card__likes-button_active' : '',
              )}
              onClick={() => this.toggleLike({ positive: false })}
              role="button"
              tabIndex={0}
              title={intl.formatMessage({
                id: `shared.review_${userLike === 'negative' ? 'remove_dislike' : 'dislike'}`,
              })}
            >
              <div
                className={cn(
                  'review-card__icon review-card__icon_negative',
                  userLike === 'negative' ? 'review-card__icon_negative__down-active' : 'review-card__icon__down',
                )}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default ReviewCardLikes;
