/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';
import checkAuth from 'tools/hocs/check-auth';
import { isUgly } from 'app/pages/game/game.helper';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import CloseButton from 'app/ui/close-button';
import ReviewForm from 'app/components/review-form';
import { editReview, cleanReview } from 'app/components/review-form/review-form.actions';

import { currentUserSlugType } from 'app/components/current-user/current-user.types';
import paths from 'config/paths';

import gameType from 'app/pages/game/game.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import { loadReview } from '../review.actions';
import reviewType from '../review.types';

import './review-edit.styl';

@prepare(
  async ({ store, params = {} }) => {
    const { id } = params;

    await store.dispatch(cleanReview());
    await store.dispatch(loadReview(id));
  },
  {
    updateParam: 'id',
  },
)
@checkAuth({ login: true })
@injectIntl
@connect((state) => ({
  game: denormalizeGame(state),
  currentUserSlug: state.currentUser.slug,
  review: state.review,
}))
export default class ReviewEdit extends Component {
  static propTypes = {
    intl: intlShape.isRequired,
    dispatch: PropTypes.func.isRequired,
    params: PropTypes.shape({
      id: PropTypes.string,
    }).isRequired,
    currentUserSlug: currentUserSlugType.isRequired,
    review: reviewType.isRequired,
    game: gameType.isRequired,
    location: locationShape.isRequired,
  };

  static defaultProps = {};

  handleSubmit = (options) => {
    const { dispatch, location, params } = this.props;
    const { id } = params;

    return dispatch(
      editReview({
        id,
        ...options,
        redirect: location.query.redirect || false,
      }),
    );
  };

  render() {
    const { intl, review, game, currentUserSlug } = this.props;
    const { image, background_image, dominant_color } = game;

    return (
      <Page
        className="page_secondary"
        helmet={{
          title: intl.formatMessage({ id: 'review.meta_title_edit' }),
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
          <CloseButton returnBackPath={paths.profileReviews(currentUserSlug)} className="review__close-button" />
          <ReviewForm showDeleteButton review={review} onSubmit={this.handleSubmit} />
        </Content>
      </Page>
    );
  }
}
