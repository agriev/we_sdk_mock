/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import { pure } from 'recompose';

import GameRatingDistribution from 'app/ui/game-rating-distribution';

import { appRatingsType } from 'app/pages/app/app.types';
import {
  ratings as gameRatingsType,
  reviews as gameReviewsType,
  id as gameIdType,
  slug as gameSlugType,
  user_review as userReviewType,
} from 'app/pages/game/game.types';

const gameRatingPropertyTypes = {
  ratings: gameRatingsType,
  reviews: gameReviewsType,
  dispatch: PropTypes.func.isRequired,
  allRatings: appRatingsType,
  isStat: PropTypes.bool,
  id: gameIdType,
  slug: gameSlugType,
  user_review: userReviewType,
};

const gameRatingDefaultProperties = {
  id: null,
  slug: null,
  ratings: [],
  allRatings: [],
  isStat: true,
  reviews: undefined,
  user_review: null,
};

const GameRatingsBlock = ({ ratings, allRatings, isStat, id, slug, dispatch, reviews, user_review }) => {
  return (
    <GameRatingDistribution
      reviews={reviews}
      dispatch={dispatch}
      id={id}
      slug={slug}
      isStat={isStat}
      allRatings={allRatings}
      ratings={ratings}
      user_review={user_review}
    />
  );
};

GameRatingsBlock.propTypes = gameRatingPropertyTypes;
GameRatingsBlock.defaultProps = gameRatingDefaultProperties;

export default pure(GameRatingsBlock);
