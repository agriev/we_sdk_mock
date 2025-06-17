/* eslint-disable camelcase */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';

import Error404 from 'interfaces/error-404';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import decodeURIComponentSafe from 'tools/decode-uri-component-safe';
import checkAuth from 'tools/hocs/check-auth';
import { isUgly } from 'app/pages/game/game.helper';
import { loadGame } from 'app/pages/game/game.actions';

import locationShape from 'tools/prop-types/location-shape';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import CloseButton from 'app/ui/close-button';
import ReviewForm from 'app/components/review-form';
import { createReview, cleanReview } from 'app/components/review-form/review-form.actions';

import './review-create.styl';

import gameType from 'app/pages/game/game.types';
import intlShape from 'tools/prop-types/intl-shape';
import paths from 'config/paths';
import currentUserType from 'app/components/current-user/current-user.types';

@prepare(async ({ store, location: { query } }) => {
  const { game } = query;

  if (!game) {
    throw new Error404();
  }

  const { slug } = JSON.parse(game);

  await store.dispatch(loadGame(slug));
  await store.dispatch(cleanReview());
})
@checkAuth({ login: true })
@injectIntl
@connect((state) => ({
  game: denormalizeGame(state),
  currentUser: state.currentUser,
  review: state.review,
}))
export default class ReviewCreate extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    intl: intlShape.isRequired,
    location: locationShape.isRequired,
    review: PropTypes.shape().isRequired,
    game: gameType.isRequired,
    currentUser: currentUserType.isRequired,
  };

  handleSubmit = (options) => {
    const { dispatch, location } = this.props;

    const gameValues = {
      ...options,
      ...options.game,
      redirect: location.query.redirect || false,
    };

    return dispatch(createReview(gameValues));
  };

  render() {
    const { intl, location, review, game, currentUser } = this.props;
    const { query } = location;
    const { loading } = review;
    const { image, background_image, dominant_color } = game;

    return (
      <Page
        className="page_secondary"
        helmet={{
          title: intl.formatMessage({ id: 'review.meta_title_create' }),
          noindex: true,
          image: background_image,
        }}
        art={{
          image: {
            path: image || background_image,
            color: `#${dominant_color}`,
          },
          height: '500px',
          colored: true,
          ugly: isUgly(game),
        }}
        header={{ display: false }}
      >
        <Content columns="1">
          <CloseButton returnBackPath={paths.profileReviews(currentUser.slug)} className="review__close-button" />
          <ReviewForm
            review={{ game: JSON.parse(decodeURIComponentSafe(query.game)), loading }}
            onSubmit={this.handleSubmit}
            clean
          />
        </Content>
      </Page>
    );
  }
}
