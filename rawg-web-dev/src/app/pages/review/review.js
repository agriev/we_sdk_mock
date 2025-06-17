/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { hot } from 'react-hot-loader/root';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import prepare from 'tools/hocs/prepare';
import whenData from 'tools/logic/when-data';

import reject from 'ramda/src/reject';
import propEq from 'ramda/src/propEq';

import { loadGame, loadGameReviews, PAGE_SIZE } from 'app/pages/game/game.actions';
import { appThemeType, appSizeType } from 'app/pages/app/app.types';
import gameType from 'app/pages/game/game.types';

import denormalizeGame from 'tools/redux/denormalize-game';
import getPagesCount from 'tools/get-pages-count';

import { showComment } from 'app/pages/app/app.actions';

import SimpleIntlMessage from 'app/components/simple-intl-message';
import Heading from 'app/ui/heading';
import GameSubpage from 'app/components/game-subpage';
import ThemeSwitcher from 'app/components/theme-switcher';
import Content from 'app/ui/content';
import ReviewCard from 'app/components/review-card';
import Rating from 'app/ui/rating/rating';
import { loadReviewComments, loadReviewCommentsReplies } from 'app/components/review-comments/review-comments.actions';
import paths from 'config/paths';
import { themeClass } from 'app/components/theme-switcher/theme-switcher.helper';
import ReviewsList from 'app/components/reviews-list';

import reviewType from './review.types';
import { loadReview } from './review.actions';

import './review.styl';

@hot
@prepare(
  async ({ store, location, params = {} }) => {
    const { id } = params;
    const { query, hash } = location;

    const review = await store.dispatch(loadReview(id));
    const gameLoader = store.dispatch(loadGame(review.game.slug));
    const reviewsLoader = store.dispatch(loadGameReviews(review.game.slug));

    if (query.comment) {
      const { id: commentId, page, children_page } = JSON.parse(decodeURIComponent(query.comment));

      await store.dispatch(loadReviewComments({ review: { id }, page, replace: true }));
      await store.dispatch(
        loadReviewCommentsReplies({
          review: { id },
          comment: { id: commentId },
          page: children_page || 1,
        }),
      );
      await Promise.all([store.dispatch(showComment(hash.replace('#', ''))), gameLoader, reviewsLoader]);
    } else {
      await Promise.all([store.dispatch(loadReviewComments({ review: { id }, page: 1 })), gameLoader, reviewsLoader]);
    }
  },
  {
    updateParam: 'id',
  },
)
@connect((state) => ({
  currentUser: state.currentUser,
  review: state.review,
  game: denormalizeGame(state),
  allRatings: state.app.ratings,
  theme: state.app.settings.theme,
  appSize: state.app.size,
}))
export default class Review extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    review: reviewType.isRequired,
    game: gameType.isRequired,
    allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
    theme: appThemeType.isRequired,
    appSize: appSizeType.isRequired,
  };

  handleRemove = () => {
    const { dispatch, review } = this.props;
    const {
      game: { id },
    } = review;

    return dispatch(push(paths.gameReviews(id)));
  };

  loadAnotherReviews = () => {
    const { game, dispatch } = this.props;
    const { slug, reviews } = game;
    const { next } = reviews;

    return dispatch(loadGameReviews(slug, next));
  };

  renderReview() {
    const { review, game } = this.props;

    if (!review.id) return null;

    // const { created = Date.now() } = review;
    // const createdDate = new Date(created);

    return (
      <div className="review">
        <div className="review__review-card">
          <ReviewCard
            className="review__review-card-body"
            game={game}
            review={review}
            onRemove={this.handleRemove}
            expanded
            showGameInfo={false}
            showRating={false}
            takeOnlyReactions={Infinity}
            showReviewMeta
          />
        </div>
      </div>
    );
  }

  renderAnotherReviews() {
    const { game, appSize } = this.props;
    const { reviews } = game;
    const { results, loading, next, count } = reviews;

    if (count - 1 <= 0) {
      return null;
    }

    const withoutCurrent = reject(propEq('id', this.props.review.id));
    const otherReviews = withoutCurrent(results);

    return (
      <div className="review__suggestions">
        <Heading rank={2} className="review__suggestions__title">
          <SimpleIntlMessage id="review.suggestions_title" />
          <span className="review__suggestions__title__counter">{count}</span>
        </Heading>

        <ReviewsList
          game={game}
          appSize={appSize}
          items={otherReviews}
          load={this.loadAnotherReviews}
          loading={loading}
          count={count}
          next={next}
          pages={getPagesCount(count, PAGE_SIZE)}
          showSeoPagination={false}
          reviewCardProps={{
            showGameInfo: false,
          }}
        />
      </div>
    );
  }

  render() {
    const { review, allRatings, dispatch, theme } = this.props;
    const { game } = review;
    const { background_image = '', dominant_color } = game;

    const afterHeading = whenData(review.id, () => {
      const name = review.user.full_name || review.user.username;
      const rating = <Rating className="review__subheading__rating" rating={review.rating} allRatings={allRatings} />;

      return (
        <div className="review__subheading">
          <FormattedMessage id="review.subhead_title" values={{ rating, name }} />
        </div>
      );
    });

    return (
      <GameSubpage
        section="review"
        showBreadcrumbs={false}
        heading={() => review.seo_h1}
        afterHeading={afterHeading}
        backPath={paths.gameReviews(game.slug)}
        className={cn('review_page', themeClass(theme))}
        helmet={{
          title: review.seo_title,
          description: review.seo_description,
          keywords: review.seo_keywords,
          image: review.share_image,
          noindex: !review.is_text || review.noindex,
        }}
        color={`#${dominant_color}`}
        art={{
          image: {
            path: background_image,
            color: `#${dominant_color}`,
          },
          height: '800px',
          colored: true,
        }}
        gameHeadMetaProperties={{
          onRight: <ThemeSwitcher dispatch={dispatch} theme={theme} />,
        }}
      >
        <Content columns="1">
          {this.renderReview()}
          {this.renderAnotherReviews()}
        </Content>
      </GameSubpage>
    );
  }
}
