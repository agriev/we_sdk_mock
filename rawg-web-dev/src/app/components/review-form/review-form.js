import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { connect } from 'react-redux';
import { FormattedMessage, injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import { push } from 'react-router-redux';
import cn from 'classnames';

import pick from 'lodash/pick';
import find from 'lodash/find';
import isObject from 'lodash/isObject';

import prop from 'ramda/src/prop';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';

import Button from 'app/ui/button/button';
import Error from 'app/ui/error/error';
import Rating from 'app/ui/rating/rating';
import Reaction from 'app/ui/reaction/reaction';
import Editor from 'app/components/editor';

import 'app/pages/review/review.styl';

import { appRatingsType, appReactionsType, appSizeType } from 'app/pages/app/app.types';
import reviewType from 'app/pages/review/review.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import paths from 'config/paths';

import { allGames as allGamesType } from 'app/pages/search/search.types';

import Confirm from 'app/ui/confirm';
import { removeReview } from 'app/components/review-card/review-card.actions';

import ReviewFormGameSelector from './review-form.game-selector';
import { checkSocialRights, cleanReview } from './review-form.actions';

import './review-form.styl';

const getRatingPositivity = (rating, ratings) => {
  const ratingObject = rating >= 0 ? find(ratings, { id: rating }) : null;

  return ratingObject ? ratingObject.positive : true;
};

@hot
@injectIntl
@withRouter
@connect((state) => ({
  ratings: state.app.ratings,
  reactions: state.app.reactions,
  allGames: {
    ...state.search.allGames,
    results: denormalizeGamesArr(state, 'search.allGames.results'),
  },
  size: state.app.size,
  errors: state.review.errors,
}))
export default class ReviewForm extends Component {
  static propTypes = {
    review: reviewType,
    errors: PropTypes.shape().isRequired,
    onSubmit: PropTypes.func.isRequired,
    className: PropTypes.string,
    dispatch: PropTypes.func.isRequired,
    ratings: appRatingsType.isRequired,
    reactions: appReactionsType.isRequired,
    selectGame: PropTypes.bool,
    allGames: allGamesType.isRequired,
    size: appSizeType.isRequired,
    intl: intlShape.isRequired,
    clean: PropTypes.bool,
    location: locationShape.isRequired,
    showDeleteButton: PropTypes.bool,
  };

  static defaultProps = {
    className: '',
    selectGame: false,
    showDeleteButton: false,
    review: {
      game: undefined,
      id: null,
      text: '',
      rating: null,
      reactions: [],
    },
    clean: false,
  };

  constructor(props) {
    super(props);

    const { review, ratings } = this.props;
    const { id, text = '', rating = null, reactions = [], game } = review;

    this.state = {
      id,
      text,
      rating,
      ratings,
      reactions: reactions.map(prop('id')),
      game,
      positive: getRatingPositivity(rating, ratings),
      facebook: false,
      twitter: false,
      rights: {
        facebook: false,
        twitter: false,
      },
    };

    this.providerClick = null;
  }

  componentDidMount() {
    this.checkRights(false, true);
    window.addEventListener('message', this.handleMessage, false);

    if (this.props.clean) {
      this.props.dispatch(cleanReview());
    }
  }

  static getDerivedStateFromProps(props, state) {
    let newState = {};

    const { id, text, rating, reactions, game } = props.review;
    const { ratings } = props;

    if (id !== state.id) {
      newState = {
        ...newState,
        id,
        text,
        rating,
        game,
        reactions: reactions.map(prop('id')),
        positive: getRatingPositivity(rating, ratings),
      };
    }

    if (ratings.length > 0 && state.ratings.length === 0) {
      newState = {
        ...newState,
        ratings,
        positive: getRatingPositivity(rating, ratings),
      };
    }

    if (Object.keys(newState).length > 0) {
      return newState;
    }

    return null;
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.handleMessage, false);
  }

  getClassName() {
    const { className } = this.props;

    return cn('review-form', {
      [className]: className,
    });
  }

  handleSubmit = (e) => {
    e.preventDefault();

    this.setState({ loading: true });

    const { onSubmit, location } = this.props;
    const { query } = location;

    const data = {
      ...pick(this.state, ['text', 'rating', 'reactions', 'positive', 'facebook', 'twitter', 'rights', 'game']),
      redirect: query.redirect === 'true',
    };

    if (typeof onSubmit === 'function') {
      onSubmit(data).catch((/* err */) => {
        this.setState({ loading: false });
      });
    }
  };

  handleRatingClick = (rating) => {
    this.setState((state) => ({
      rating: state.rating === rating.id ? null : rating.id,
      positive: rating.positive,
    }));
  };

  handleReactionClick = (reaction) => {
    this.setState((state) => ({
      reactions: state.reactions.includes(reaction.id)
        ? state.reactions.filter((reactionId) => reactionId !== reaction.id)
        : [...state.reactions, reaction.id],
    }));
  };

  handlePublishClick = (provider) => {
    this.setState((state) => ({
      [provider]: !state[provider],
    }));
  };

  handleTextarea = (text) => this.setState({ text });

  handleSelectGame = (game) => this.setState({ game });

  checkRights = (click, event) => {
    const { dispatch } = this.props;

    if (event !== true && event instanceof Object && event.data.type !== 'UTH_PROVIDER_MESSAGE') {
      return;
    }

    dispatch(checkSocialRights()).then((res) => {
      this.setState((state) => ({
        facebook: click && this.providerClick === 'facebook' ? res.facebook : state.facebook,
        twitter: click && this.providerClick === 'twitter' ? res.twitter : state.twitter,
        rights: res,
      }));
    });
  };

  remove = async () => {
    const { dispatch, review } = this.props;
    const { game } = review;

    await dispatch(removeReview(review));

    dispatch(push(paths.game(game.slug)));
  };

  handleMessage = (event) => {
    this.checkRights(true, event);
  };

  render() {
    const { errors, selectGame, allGames, size, dispatch, intl, showDeleteButton } = this.props;
    const { ratings: allRatings = [], reactions: allReactions = [] } = this.props;
    const { text, rating: ratingId, reactions: reactionIds, positive, loading, game } = this.state;

    return (
      <div className={this.getClassName()}>
        <form onSubmit={this.handleSubmit}>
          <div className="review-form__form">
            <SimpleIntlMessage id="review.form_title" className="review-form__subtitle" />
            <span className="review-form__title">{game && game.name}</span>
            {selectGame && (
              <ReviewFormGameSelector
                intl={intl}
                allGames={allGames}
                size={size}
                dispatch={dispatch}
                allRatings={allRatings}
                onSelectGame={this.handleSelectGame}
              />
            )}

            <div className="review-form__ratings">
              {allRatings.map((rating) => (
                <Rating
                  className="review-form__rating"
                  rating={rating}
                  allRatings={allRatings}
                  hover
                  kind="button"
                  active={rating.id === ratingId}
                  onClick={this.handleRatingClick}
                  key={rating.id}
                />
              ))}
            </div>

            <div className="review-form__field-textarea">
              <div className="review-form__text-subtitle">
                <SimpleIntlMessage id="review.form_review_text" />
              </div>
              <Editor
                text={text}
                onChange={this.handleTextarea}
                placeholder={intl.formatMessage({ id: 'review.form_placeholder' })}
              />
              {isObject(errors) && errors.text && errors.text.length > 0 && (
                <Error kind="filed" error={errors.text[0]} />
              )}
            </div>

            {ratingId && (
              <div>
                <div className="review-form__reactions-title">
                  <FormattedMessage id="review.form_reactions_title" />
                </div>
                <div className="review-form__reactions">
                  {allReactions
                    .filter((reaction) => reaction.positive === positive)
                    .map((reaction) => (
                      <Reaction
                        className="review-form__reaction"
                        reaction={reaction}
                        hover
                        kind="button"
                        active={reactionIds && reactionIds.includes(reaction.id)}
                        onClick={this.handleReactionClick}
                        key={reaction.id}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="review-form__controls">
            <div className="review-form__button">
              {showDeleteButton && (
                <Confirm className="review-form__remove-button" onConfirm={this.remove}>
                  <FormattedMessage id="review.delete_review" />
                </Confirm>
              )}
              <Button
                kind="fill"
                size="medium"
                disabled={loading || !ratingId || !game || !text || text === '<br>'}
                loading={loading}
              >
                <FormattedMessage id="review.form_button" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    );
  }
}
