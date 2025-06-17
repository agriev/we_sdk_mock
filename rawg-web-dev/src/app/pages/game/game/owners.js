/* eslint-disable camelcase */
import React from 'react';
import { pure } from 'recompose';
import { Link } from 'app/components/link';
import SVGInline from 'react-svg-inline';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import paths from 'config/paths';

import plusIcon from 'assets/icons/plus.svg';
import discussIcon from 'assets/icons/discuss.svg';

import {
  id as gameIdType,
  name as gameNameType,
  slug as gameSlugType,
  user_review as gameUserReviewType,
  reviews_count as gameReviewsCountType,
} from 'app/pages/game/game.types';

const gameOwnersPropertyTypes = {
  id: gameIdType,
  name: gameNameType,
  slug: gameSlugType,
  user_review: gameUserReviewType,
  reviews_count: gameReviewsCountType,
};

const gameOwnersDefaultProperties = {
  id: undefined,
  name: '',
  slug: '',
  user_review: undefined,
  reviews_count: 0,
};

const GameOwnersBlock = ({ id, name, slug, user_review, reviews_count }) => {
  if (!id) {
    return null;
  }

  const reviewButton = user_review ? (
    <Link className="game__ratings-review-button" to={paths.reviewEdit(user_review.id)} rel="nofollow">
      {user_review.is_text && <SimpleIntlMessage id="game.edit_review" />}
      {!user_review.is_text && (
        <SimpleIntlMessage id="game.add_review" values={{ reviews: reviews_count > 0 ? reviews_count : '' }} />
      )}
    </Link>
  ) : (
    <Link className="game__ratings-review-button" to={paths.reviewCreate({ id, name, slug })} rel="nofollow">
      <SVGInline svg={plusIcon} className="game__ratings-review-button__icon" />
      <SimpleIntlMessage id="game.add_review" values={{ reviews: reviews_count > 0 ? reviews_count : '' }} />
    </Link>
  );

  const discussButton = (
    <Link className="game__ratings-review-button" to={paths.postCreate({ id, name, slug })} rel="nofollow">
      <SVGInline svg={discussIcon} className="game__ratings-review-button__icon" />
      <SimpleIntlMessage id="game.post_with_users" />
    </Link>
  );

  return (
    <div className="game__owners">
      {reviewButton}
      {discussButton}
    </div>
  );
};

GameOwnersBlock.propTypes = gameOwnersPropertyTypes;
GameOwnersBlock.defaultProps = gameOwnersDefaultProperties;

export default pure(GameOwnersBlock);
