import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import cn from 'classnames';

import paths from 'config/paths';
import appHelper from 'app/pages/app/app.helper';

import gameType from 'app/pages/game/game.types';
import currentUserType from 'app/components/current-user/current-user.types';

import Rating from 'app/ui/rating';

import ReviewCardYourBadge from '../your-badge';
import ReviewCardMenu from '../menu';
import ReviewCardSourceInfo from '../source-info';

import './header.styl';

const propTypes = {
  showGameInfo: PropTypes.bool.isRequired,
  showRating: PropTypes.bool.isRequired,
  your: PropTypes.bool.isRequired,
  game: gameType.isRequired,
  rating: PropTypes.shape().isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  size: PropTypes.string.isRequired,
  currentUser: currentUserType.isRequired,
  review: PropTypes.shape().isRequired,
  showMenu: PropTypes.bool.isRequired,
  remove: PropTypes.func.isRequired,
  kind: PropTypes.string.isRequired,
};

const defaultProps = {};

const ReviewCardHeader = ({
  showGameInfo,
  showRating,
  game,
  rating,
  allRatings,
  size,
  your,
  currentUser,
  review,
  showMenu,
  remove,
  kind,
}) => {
  const ReviewTag = review.is_external ? 'div' : Link;
  const renderControls = () => {
    if (review.is_external) {
      return (
        <div className="review-card__controls">
          <ReviewCardSourceInfo review={review} />
        </div>
      );
    }

    return (
      <div className="review-card__controls">
        {appHelper.isDesktopSize({ size }) && <ReviewCardYourBadge your={your} />}
        <ReviewCardMenu currentUser={currentUser} review={review} showMenu={showMenu} remove={remove} />
      </div>
    );
  };

  if (showGameInfo && game) {
    return (
      <div className="review-card__header">
        <>
          <div className="review-card__game-title-wrapper">
            <div>
              <ReviewTag className="review-card__game-title" to={paths.game(game.slug)}>
                {game.name}
              </ReviewTag>
            </div>
            {kind === 'common' && (
              <Rating
                rating={rating}
                allRatings={allRatings}
                className={cn('review-card__rating', 'review-card__rating_title')}
              />
            )}
          </div>
          {kind === 'slider' && (
            <Rating
              rating={rating}
              allRatings={allRatings}
              className={cn('review-card__rating', 'review-card__rating_title', 'review-card__rating_fixed')}
            />
          )}
        </>
        {renderControls()}
      </div>
    );
  }

  return (
    <div className="review-card__header">
      {showRating && (
        <>
          <ReviewTag className="review-card__rating-link" to={paths.review(review.id)}>
            <Rating className="review-card__rating" rating={rating} allRatings={allRatings} isIcon={false} />
          </ReviewTag>
          <Rating className="review-card__rating" rating={rating} allRatings={allRatings} kind="emoji" />
        </>
      )}
      {renderControls()}
    </div>
  );
};

ReviewCardHeader.propTypes = propTypes;
ReviewCardHeader.defaultProps = defaultProps;

export default ReviewCardHeader;
