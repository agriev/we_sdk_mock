import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';

import get from 'lodash/get';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import './game-users-reviews.styl';

import paths from 'config/paths';

import getPagesCount from 'tools/get-pages-count';

import Heading from 'app/ui/heading/heading';
import gameType from 'app/pages/game/game.types';
import { loadGameReviews, PAGE_SIZE } from 'app/pages/game/game.actions';
import ReviewsList from 'app/components/reviews-list';
import { appSizeType } from 'app/pages/app/app.types';

const propTypes = {
  game: gameType,
  appSize: appSizeType.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const defaultProps = {
  game: undefined,
};

const GameUsersReviews = ({ appSize, game, dispatch }) => {
  if (!game) {
    return null;
  }

  const { id, reviews } = game;
  const { next, count, loading } = reviews;
  const load = useCallback(() => dispatch(loadGameReviews(id, next)), [game.slug, id, next]);
  const items = get(game, 'reviews.results', []);

  return (
    <div className="game_users-reviews">
      <Heading className="game_users-reviews__heading" rank={4}>
        <Link to={paths.gameReviews(game.slug)}>
          <SimpleIntlMessage id="review.users_reviews_title_1" />
        </Link>
        <div>
          <SimpleIntlMessage id="review.users_reviews_title_2" values={{ name: game.name }} />
          <span className="game_users-reviews__title-counter">{get(game, 'reviews.count')}</span>
        </div>
      </Heading>

      <ReviewsList
        game={game}
        appSize={appSize}
        items={items}
        load={load}
        loading={loading}
        count={count}
        next={next}
        pages={getPagesCount(count, PAGE_SIZE)}
        reviewCardProps={{
          className: 'game_users-reviews__item',
          showGameInfo: false,
        }}
      />
    </div>
  );
};

GameUsersReviews.propTypes = propTypes;
GameUsersReviews.defaultProps = defaultProps;

export default GameUsersReviews;
