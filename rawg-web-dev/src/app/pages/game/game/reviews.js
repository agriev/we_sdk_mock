import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import cn from 'classnames';

import get from 'lodash/get';
import take from 'lodash/take';

import reject from 'ramda/src/reject';
import when from 'ramda/src/when';
import propEq from 'ramda/src/propEq';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import checkLogin from 'tools/check-login';
import getPagesCount from 'tools/get-pages-count';
import HideOnScroll from 'app/render-props/hide-on-scroll';

import Select from 'app/ui/select';
import Rating from 'app/ui/rating';
import AddGameCard from 'app/ui/add-game-card';
import { createReview, editReview } from 'app/components/review-form/review-form.actions';
import ReviewCard from 'app/components/review-card';
import { loadGameReviews, updateGameReviews, PAGE_SIZE } from 'app/pages/game/game.actions';
import { removeReview } from 'app/components/review-card/review-card.actions';
import ReviewsList from 'app/components/reviews-list';

import { appRatingsType, appSizeType } from 'app/pages/app/app.types';

import paths from 'config/paths';
import gameType, { reviews as gameReviewsType } from 'app/pages/game/game.types';
import intlShape from 'tools/prop-types/intl-shape';

import './reviews.styl';

export const reviewsCount = 10;

@hot
export default class GameReviewsBlock extends React.PureComponent {
  static propTypes = {
    appSize: appSizeType.isRequired,
    ratings: appRatingsType.isRequired,
    game: gameType.isRequired,
    reviews: gameReviewsType,
    dispatch: PropTypes.func.isRequired,
    intl: intlShape.isRequired,
    compact: PropTypes.bool,
  };

  static defaultProps = {
    reviews: {
      count: 0,
      results: [],
    },
    compact: false,
  };

  constructor(props) {
    super(props);

    const userReview = get(props, 'reviews.your');
    const { compact } = props;

    this.state = {
      userReview,
      ordering: '-created',
      compact,
    };
  }

  static getDerivedStateFromProps(props, state) {
    const yourReviewAdded = props.reviews.your && !state.userReview;
    const yourReviewRemove = !props.reviews.your && state.userReview;

    if (yourReviewAdded || yourReviewRemove) {
      return {
        userReview: props.reviews.your,
      };
    }

    return null;
  }

  getOrderingContent() {
    const { intl } = this.props;
    const { ordering } = this.state;

    return {
      title: intl.formatMessage({ id: 'game.ordering_title' }),
      items: [
        {
          id: '-created',
          value: intl.formatMessage({ id: 'game.ordering_-created' }),
          active: ordering === '-created',
        },
        {
          id: 'created',
          value: intl.formatMessage({ id: 'game.ordering_created' }),
          active: ordering === 'created',
        },
        {
          id: '-likes_rating',
          value: intl.formatMessage({ id: 'game.ordering_-likes_rating' }),
          active: ordering === '-likes_rating',
        },
        {
          id: '-following',
          value: intl.formatMessage({ id: 'game.ordering_-following' }),
          active: ordering === '-following',
        },
      ],
    };
  }

  update = (removedReview) => {
    const { dispatch, game } = this.props;
    const { id } = game;

    dispatch(updateGameReviews(id, { removedReview }));
  };

  handleOrderingChange = (ordering) => {
    const { dispatch, game } = this.props;
    const { id } = game;

    dispatch(loadGameReviews(id, 1, { ordering: ordering[0].id }));

    this.setState({ ordering: ordering[0].id, compact: false });
  };

  load = () => {
    const { dispatch, game, reviews } = this.props;
    const { id } = game;
    const { next } = reviews;
    const { ordering, compact } = this.state;
    const page = compact ? 1 : next;

    if (compact) {
      this.setState({ compact: false });
    }

    return dispatch(loadGameReviews(id, page, { ordering }));
  };

  changeRating = (rating) => {
    const { dispatch, game } = this.props;
    const { id, slug } = game;
    const { userReview } = this.state;

    if (userReview && userReview.rating === rating.id) {
      dispatch(removeReview(userReview)).then(() => {
        this.setState({ userReview: null });
        dispatch(updateGameReviews(id, { removedReview: userReview }));
      });
    } else {
      checkLogin(dispatch, async () => {
        if (userReview) {
          await dispatch(
            editReview({
              id: userReview.id,
              rating: rating.id,
              redirect: false,
              isBack: false,
            }),
          );
        } else {
          await dispatch(
            createReview({
              id,
              slug,
              rating: rating.id,
              redirect: false,
              isBack: false,
            }),
          );
        }

        this.setState((state) => ({
          userReview: {
            ...state.userReview,
            rating: rating.id,
          },
        }));

        dispatch(updateGameReviews(id));
      });
    }
  };

  renderOrdering() {
    const { intl } = this.props;
    const { ordering } = this.state;

    return (
      <Select
        button={{
          className: 'game-reviews__ordering-button',
          kind: 'inline',
        }}
        buttonValue={intl.formatMessage({ id: `game.ordering_${ordering}` })}
        content={{
          className: 'game-reviews__ordering-content',
          ...this.getOrderingContent(),
        }}
        multiple={false}
        className="game-reviews__ordering"
        containerClassName="game-reviews__ordering-container"
        onChange={this.handleOrderingChange}
        kind="menu"
        onlyArrow
      />
    );
  }

  renderAddReview() {
    const { game, ratings } = this.props;
    const { id, name, slug } = game;
    const { userReview } = this.state;
    const { reviews } = this.props;
    const { your } = reviews;

    const url = your ? paths.reviewEdit(your.id) : paths.reviewCreate({ id, name, slug });

    return (
      <div className="game-reviews__add-wrapper">
        <Link to={url} className="game-reviews__add-link" rel="nofollow">
          <AddGameCard
            className="game-reviews__add-card"
            wide
            title={<FormattedMessage id="game.add_review" values={{ reviews: '' }} />}
          />
        </Link>
        <div className="game-reviews__fastadd-buttons">
          {ratings.map((rating) => (
            <Rating
              key={rating.id}
              rating={rating}
              allRatings={ratings}
              kind="button"
              onClick={this.changeRating}
              active={userReview && userReview.rating === rating.id}
              hover
            />
          ))}
        </div>
      </div>
    );
  }

  renderUserReview() {
    const { game, reviews } = this.props;
    return (
      <ReviewCard
        game={game}
        className="game-reviews__item"
        review={reviews.your}
        onRemove={this.update}
        semantics="gamepage"
        your
      />
    );
  }

  renderReviews(reviews) {
    const { game, compact, appSize } = this.props;
    const { your, next, loading, count } = this.props.reviews;

    const withoutUser = when(() => !!your, reject(propEq('id', get(your, 'id'))));
    const items = withoutUser(reviews);

    const reviewsList = (
      <ReviewsList
        game={game}
        appSize={appSize}
        items={items}
        load={this.load}
        loading={loading}
        count={count}
        next={next}
        pages={getPagesCount(count, PAGE_SIZE)}
        showSeoPagination={!compact}
        reviewCardProps={{
          className: 'game-reviews__item',
          semantics: 'gamepage',
          showGameInfo: false,
        }}
      />
    );

    if (compact) {
      return (
        <>
          {reviewsList}
          <HideOnScroll>
            {(isActive) => (
              <Link
                className={cn('game-reviews__more-button', {
                  'game-reviews__more-button_hidden': !isActive,
                })}
                to={paths.gameReviews(game.slug)}
              >
                <SimpleIntlMessage id="shared.review_more" />
              </Link>
            )}
          </HideOnScroll>
        </>
      );
    }

    return reviewsList;
  }

  render() {
    const { reviews } = this.props;
    const { compact } = this.state;
    const { results, your } = reviews;
    const count = your ? reviewsCount - 1 : reviewsCount;
    const visibleReviews = compact && results.length > count ? take(results, count) : results;

    return (
      <div className="game-reviews">
        {this.renderOrdering()}
        {your && your.text ? this.renderUserReview() : this.renderAddReview()}
        {visibleReviews.length > 0 && this.renderReviews(visibleReviews)}
      </div>
    );
  }
}
