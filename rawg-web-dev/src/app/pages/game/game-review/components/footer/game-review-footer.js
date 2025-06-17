import React from 'react';
import PropTypes from 'prop-types';

import cond from 'ramda/src/cond';
import equals from 'ramda/src/equals';
import gte from 'ramda/src/gte';
import always from 'ramda/src/always';
import { FormattedMessage } from 'react-intl';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import './game-review-footer.styl';

const getReviewRatingTitle = cond([
  [equals(0), always('review.ag_rating_0')],
  [gte(9), always('review.ag_rating_9')],
  [gte(20), always('review.ag_rating_20')],
  [gte(30), always('review.ag_rating_30')],
  [gte(40), always('review.ag_rating_40')],
  [gte(50), always('review.ag_rating_50')],
  [gte(60), always('review.ag_rating_60')],
  [gte(70), always('review.ag_rating_70')],
  [gte(80), always('review.ag_rating_80')],
  [gte(90), always('review.ag_rating_90')],
  [gte(96), always('review.ag_rating_96')],
  [gte(100), always('review.ag_rating_100')],
]);

const propTypes = {
  review: PropTypes.shape({
    id: PropTypes.number,
    created: PropTypes.string,
    user: PropTypes.shape(),
    rating: PropTypes.number,
  }),
};

const defaultProps = {
  review: undefined,
};

const GameReviewFooter = ({ review }) => {
  const date = new Date(review.created);

  return (
    <div className="game_review__footer">
      <div className="game_review__footer__rating">
        <div className="game_review__footer__rating__heading">
          <SimpleIntlMessage id="review.ag_rating_title" />
        </div>
        <div className="game_review__footer__rating__counter">{review.rating}%</div>
        <div className="game_review__footer__rating__title">
          <SimpleIntlMessage id={getReviewRatingTitle(review.rating)} />
        </div>
      </div>
      <div className="game_review__footer__author">
        <FormattedMessage
          id="review.ag_rating_author"
          values={{
            author: <strong>{review.user.full_name}</strong>,
            day: date.getDate(),
            month: date.getMonth() + 1,
            year: date.getFullYear(),
          }}
        />
      </div>
    </div>
  );
};

GameReviewFooter.propTypes = propTypes;
GameReviewFooter.defaultProps = defaultProps;

export default GameReviewFooter;
