import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';

import { FormattedMessage } from 'react-intl';

import paths from 'config/paths';
import appHelper from 'app/pages/app/app.helper';

import gameType from 'app/pages/game/game.types';
import reviewType from 'app/pages/review/review.types';

import Rating from 'app/ui/rating';
import Avatar from 'app/ui/avatar';
import Time from 'app/ui/time';

import './short.styl';

const propTypes = {
  getClassName: PropTypes.func.isRequired,
  review: reviewType.isRequired,
  game: gameType.isRequired,
  rating: PropTypes.shape().isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const defaultProps = {};

const ReviewCardShortKind = ({ getClassName, game, rating, review, allRatings }) => {
  const { user } = review;

  if (!user || !game) {
    return null;
  }

  const userLink = <Link to={{ pathname: paths.profile(user.slug), state: user }}>{appHelper.getName(user)}</Link>;

  const gameLink = <Link to={{ pathname: paths.game(game.slug), state: game }}>{game.name}</Link>;

  const ratingElement = <Rating rating={rating} allRatings={allRatings} kind="emoji" hover active />;

  return (
    <div className={getClassName()}>
      <Link
        className="review-card_short__user-avatar-link"
        to={{ pathname: paths.profile(user.slug), state: user }}
        href={paths.profile(user.slug)}
      >
        <Avatar size={24} src={user.avatar} profile={user} className="event-header__avatars" />
      </Link>
      <div className="review-card_short__text">
        <FormattedMessage
          id="review.short_text"
          values={{
            user: userLink,
            game: gameLink,
            rating: ratingElement,
          }}
        />
        <div className="review-card_short__text-subtitle">
          <Time date={review.edited} relative={1} />
        </div>
      </div>
    </div>
  );
};

ReviewCardShortKind.propTypes = propTypes;
ReviewCardShortKind.defaultProps = defaultProps;

export default ReviewCardShortKind;
