import React, { Component } from 'react';
import { push } from 'react-router-redux';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import cn from 'classnames';

import paths from 'config/paths';

import checkLogin from 'tools/check-login';

import { GAME_USER_REVIEW_UPDATED } from 'redux-logic/reducers/games';
import { createReview, editReview } from 'app/components/review-form/review-form.actions';
import { removeReview } from 'app/components/review-card/review-card.actions';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import RateButtonsList from 'app/ui/rate-card/components/rate-buttons-list';
import UserReview from 'app/ui/user-review';
import Loading2 from 'app/ui/loading-2';

import gameType from 'app/pages/game/game.types';

import './review-manager.styl';

const propTypes = {
  game: gameType.isRequired,
  dispatch: PropTypes.func.isRequired,
};

class ReviewManager extends Component {
  static propTypes = propTypes;

  constructor(props) {
    super(props);

    this.state = {
      editingReview: false,
      loading: false,
    };
  }

  changeRating = async ({ rating, game }) => {
    const { dispatch } = this.props;
    const { id, slug, user_review: review } = game;

    this.setState({ loading: true });
    await dispatch(
      review
        ? editReview({
            id: review.id,
            rating,
            redirect: false,
            isBack: false,
          })
        : createReview({
            id,
            slug,
            rating,
            redirect: false,
            isBack: false,
          }),
    ).then((res) => {
      dispatch({
        type: GAME_USER_REVIEW_UPDATED,
        data: {
          gameSlug: slug,
          review: {
            id: res.id,
            rating: res.rating,
            is_text: res.is_text,
          },
        },
      });
      this.setState({ loading: false, editingReview: false });
    });
  };

  changeRatingHandler = ({ rating, game }) => {
    checkLogin(this.props.dispatch, () => this.changeRating({ rating, game }));
  };

  editReview = () => {
    const {
      dispatch,
      game: { user_review: review },
    } = this.props;

    if (review.is_text) {
      dispatch(push(paths.reviewEdit(review.id)));
    } else {
      this.setState({ editingReview: true });
    }
  };

  deleteReview = () => {
    const { game, dispatch } = this.props;
    const { slug, user_review: review } = game;

    this.setState({ loading: true });
    dispatch(removeReview(review)).then(() => {
      dispatch({
        type: GAME_USER_REVIEW_UPDATED,
        data: {
          gameSlug: slug,
          review: null,
        },
      });
      this.setState({ loading: false });
    });
  };

  renderLoading() {
    return (
      <>
        <SimpleIntlMessage className="review-manager__title" id="shared.review_your" />
        <div className="review-manager__loading-wrapper">
          <Loading2 radius={48} stroke={2} />
        </div>
      </>
    );
  }

  renderReview() {
    const { game } = this.props;
    const { user_review: review } = game;

    return (
      <>
        <SimpleIntlMessage className="review-manager__title" id="shared.review_your" />
        <UserReview review={review} onEditClick={this.editReview} onDeleteClick={this.deleteReview} />
        {!review.is_text && (
          <Link className="review-manager__link" to={paths.reviewEdit(review.id)}>
            <SimpleIntlMessage id="activity.button_review" />
          </Link>
        )}
      </>
    );
  }

  renderRate() {
    const { game } = this.props;
    const { id, name, slug } = game;

    return (
      <>
        <SimpleIntlMessage className="review-manager__title" id="shared.game_menu_review_title" />
        <RateButtonsList isActive changeRating={this.changeRatingHandler} game={game} kind="dark" />
        <Link className="review-manager__link" to={paths.reviewCreate({ id, name, slug })}>
          <SimpleIntlMessage id="activity.button_review" />
        </Link>
      </>
    );
  }

  renderReviewManager() {
    const { game } = this.props;
    const { editingReview } = this.state;
    const { user_review: review } = game;

    return review && !editingReview ? this.renderReview() : this.renderRate();
  }

  render() {
    const { loading } = this.state;
    const className = cn('review-manager', {
      'review-manager_loading': loading,
    });

    return <div className={className}>{loading ? this.renderLoading() : this.renderReviewManager()}</div>;
  }
}

export default ReviewManager;
