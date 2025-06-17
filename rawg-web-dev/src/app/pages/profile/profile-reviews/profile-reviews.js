/* eslint-disable camelcase */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { push } from 'react-router-redux';
import { hot } from 'react-hot-loader/root';
import PropTypes from 'prop-types';

import currentUserType from 'app/components/current-user/current-user.types';

import prepare from 'tools/hocs/prepare';
import { return404IfEmptyPage } from 'app/pages/app/app.actions';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import paths from 'config/paths';

import appHelper from 'app/pages/app/app.helper';
import Content from 'app/ui/content';
import Rating from 'app/ui/rating';
import ToggleButton from 'app/ui/toggle-button';
import EmptyList from 'app/ui/empty-list';
import Button from 'app/ui/button';
import ReviewsList from 'app/components/reviews-list';

import { appSizeType } from 'app/pages/app/app.types';
import locationShape from 'tools/prop-types/location-shape';
import getPagesCount from 'tools/get-pages-count';

import { PAGE_SIZE } from 'app/pages/game/game.actions';

import { loadProfileReviews, updateProfileReviews } from '../profile.actions';

import './profile-reviews.styl';

@hot
@prepare(
  async ({ store, location, params = {} }) => {
    const { id } = params;
    const { query } = location;
    const rating = query.rating ? +query.rating : null;

    await Promise.allSettled([store.dispatch(loadProfileReviews(id, 1, { rating, onlyReviews: false }))]).then((r) =>
      return404IfEmptyPage(store.dispatch)(r.values),
    );
  },
  {
    updateParam: 'id',
    loading: false,
  },
)
@connect((state) => ({
  size: state.app.size,
  allRatings: state.app.ratings,
  currentUser: state.currentUser,
  profile: state.profile,
  ratedGamesPercent: state.currentUser.rated_games_percent,
}))
export default class ProfileReviews extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    location: locationShape.isRequired,
    params: PropTypes.shape().isRequired,
    profile: PropTypes.shape().isRequired,
    size: appSizeType.isRequired,
    ratedGamesPercent: PropTypes.number.isRequired,
    currentUser: currentUserType.isRequired,
    allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  };

  constructor(props) {
    super(props);

    const { location } = this.props;
    const { query } = location;
    const rating = query.rating ? +query.rating : null;

    this.state = {
      rating,
      onlyReviews: false,
    };
  }

  load = (next) => {
    const {
      dispatch,
      params: { id },
      profile,
    } = this.props;
    const { reviews } = profile;
    const { rating, onlyReviews } = this.state;

    return dispatch(
      loadProfileReviews(id, next || reviews.next, {
        rating,
        onlyReviews,
      }),
    );
  };

  update = (removedReview) => {
    const {
      dispatch,
      params: { id },
    } = this.props;

    dispatch(updateProfileReviews(id, { removedReview }));
  };

  loadFirst = () => this.load(1);

  handleRatingClick = (ratingArgument) => {
    this.setState(
      (state) => ({
        rating: state.rating === ratingArgument.id ? null : ratingArgument.id,
      }),
      this.loadFirst,
    );
  };

  handleOnlyReviewsClick = () => {
    this.setState((state) => ({ onlyReviews: !state.onlyReviews }), this.loadFirst);
  };

  isCurrentUser() {
    const { currentUser, params } = this.props;

    return currentUser.slug === params.id;
  }

  renderRateButton() {
    const { ratedGamesPercent, dispatch } = this.props;

    if (!this.isCurrentUser() || !ratedGamesPercent || ratedGamesPercent === 0) {
      return null;
    }

    return (
      <div className="profile-reviews__rate-button-wrap">
        <div key="title" className="profile-reviews__ratings-title">
          <SimpleIntlMessage id="profile.rate_button_title" values={{ percent: ratedGamesPercent }} />
        </div>
        <Button
          kind="fill"
          size="medium"
          className="profile-reviews__rate-button"
          onClick={() => {
            dispatch(push(paths.rateUserGames));
          }}
        >
          <FormattedMessage
            id="profile.rate_button_label"
            values={{
              percent: <span className="profile-reviews__rate-percent">{`${ratedGamesPercent}%`}</span>,
            }}
          />
        </Button>
      </div>
    );
  }

  renderReviews() {
    const { profile, size: appSize } = this.props;
    const { reviews, user } = profile;
    const { loading, next, results, count } = reviews;

    if (!loading && !count) {
      return (
        <div className="profile-reviews">
          <EmptyList message={<SimpleIntlMessage id="profile.empty_reviews" />} />
        </div>
      );
    }

    return (
      <ReviewsList
        className="profile-reviews__reviews"
        appSize={appSize}
        items={results}
        load={this.load}
        loading={loading}
        count={count}
        next={next}
        pages={getPagesCount(count, PAGE_SIZE)}
        reviewCardProps={(review) => ({
          className: 'profile-reviews__review',
          review: { ...review, user },
          onRemove: this.update,
        })}
      />
    );
  }

  renderRatingsFilter() {
    const { profile, allRatings } = this.props;
    const { reviews } = profile;
    const { ratings } = reviews;
    const { total, results } = ratings;
    const { rating: ratingId } = this.state;
    const hasResults = Array.isArray(results) && results.length > 0;

    return (
      <div className="profile-reviews__ratings">
        {(hasResults || this.state.onlyReviews) && (
          <>
            <div className="profile-reviews__ratings-title">
              <FormattedMessage id="profile.reviews_ratings" values={{ count: total }} />
            </div>
            {profile.reviews_text_count !== 0 && (
              <ToggleButton
                className="profile-reviews__toggle-only-reivews"
                enabled={this.state.onlyReviews}
                onChange={this.handleOnlyReviewsClick}
                text={<FormattedMessage id="profile.toggle_only_reviews" />}
              />
            )}
          </>
        )}
        <div className="profile-reviews__ratings-items">
          {results.map((rating) => (
            <div className="profile-reviews__ratings-item" key={rating.id}>
              <Rating
                rating={rating}
                allRatings={allRatings}
                kind="button"
                hover
                active={rating.id === ratingId}
                onClick={this.handleRatingClick}
                key={rating.id}
              />
              <div className="profile-reviews__ratings-item-count">{rating.count}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  render() {
    const { size, profile } = this.props;
    const { reviews } = profile;
    const { loading, count } = reviews;

    if (!loading && !count && !this.state.onlyReviews) {
      return (
        <div className="profile-reviews">
          <EmptyList message={<SimpleIntlMessage id="profile.empty_reviews" />} />
        </div>
      );
    }

    return (
      <div className="profile-reviews">
        {appHelper.isDesktopSize({ size }) ? (
          <Content columns={loading && !count && !this.state.onlyReviews ? '1' : '2-1'}>
            <div>{this.renderReviews()}</div>
            <div>
              {this.renderRatingsFilter()}
              {this.renderRateButton()}
            </div>
          </Content>
        ) : (
          <Content columns="1">
            {this.renderRatingsFilter()}
            {this.renderReviews()}
          </Content>
        )}
      </div>
    );
  }
}
