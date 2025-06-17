/* eslint-disable no-nested-ternary, react/no-danger, camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import cn from 'classnames';

import isPlainObject from 'lodash/isPlainObject';
import isArray from 'lodash/isArray';

import currentUserType from 'app/components/current-user/current-user.types';
import gameType from 'app/pages/game/game.types';
import reviewType from 'app/pages/review/review.types';
import { appLocaleType } from 'app/pages/app/app.types';

import paths from 'config/paths';
import RenderMounted from 'app/render-props/render-mounted';

import ReviewComments from '../review-comments';
import { removeReview } from './review-card.actions';

import ReviewCardBackground from './components/background';
import ReviewCardHeader from './components/header';
import ReviewCardText from './components/text';
import ReviewCardMeta from './components/meta';
import ReviewCardUserInfo from './components/user-info';
import ReviewCardReactions from './components/reactions';
import ReviewCardGameBackground from './components/game-background';
import ReviewCardLikes from './components/likes';

import ReviewCardShortKind from './kinds/short';

import './review-card.styl';
import '../editor/editor.styl';

@connect((state) => ({
  size: state.app.size,
  ratings: state.app.ratings,
  reactions: state.app.reactions,
  appLocale: state.app.locale,
  isSpider: state.app.request.isSpider,
  currentUser: state.currentUser,
}))
export default class ReviewCard extends Component {
  static propTypes = {
    appLocale: appLocaleType.isRequired,
    isSpider: PropTypes.bool.isRequired,
    review: reviewType.isRequired,
    game: gameType,
    your: PropTypes.bool,
    showGameInfo: PropTypes.bool,
    showUserInfo: PropTypes.bool,
    showRating: PropTypes.bool,
    showComments: PropTypes.bool,
    showMenu: PropTypes.bool,
    showEmbeds: PropTypes.bool,
    fullReviewLink: PropTypes.bool,
    onRemove: PropTypes.func,
    color: PropTypes.string,
    kind: PropTypes.oneOf(['common', 'slider']),
    textLines: PropTypes.number,
    textHeight: PropTypes.number,
    acceptableTextLength: PropTypes.number,
    className: PropTypes.string,
    background: PropTypes.string,
    emojiList: PropTypes.node,
    loadOtherComments: PropTypes.string,
    truncateText: PropTypes.bool,
    truncateStyle: PropTypes.oneOf(['lines', 'height']),
    semantics: PropTypes.oneOf(['full', 'gamepage']),
    expanded: PropTypes.bool,
    dispatch: PropTypes.func.isRequired,
    size: PropTypes.string.isRequired,
    ratings: PropTypes.arrayOf(PropTypes.object).isRequired,
    reactions: PropTypes.arrayOf(PropTypes.object).isRequired,
    currentUser: currentUserType.isRequired,
    takeOnlyReactions: PropTypes.number,
    showReviewMeta: PropTypes.bool,
  };

  static defaultProps = {
    game: undefined,
    your: false,
    showGameInfo: false,
    showUserInfo: true,
    showRating: true,
    showComments: true,
    showMenu: true,
    showEmbeds: true,
    fullReviewLink: false,
    onRemove: undefined,
    color: '#151515',
    kind: 'common',
    textLines: undefined,
    textHeight: undefined,
    acceptableTextLength: undefined,
    className: '',
    background: undefined,
    emojiList: undefined,
    loadOtherComments: undefined,
    truncateText: true,
    truncateStyle: undefined,
    semantics: 'full',
    expanded: false,
    takeOnlyReactions: undefined,
    showReviewMeta: false,
  };

  constructor(props) {
    super(props);

    const { expanded } = props;

    this.state = {
      expanded,
    };
  }

  getClassName = () => {
    const { className, kind, review } = this.props;

    return cn('review-card', {
      [`review-card_${kind}`]: kind,
      'review-card_short': review.text === '',
      'review-card_full': review.text !== '',
      [className]: className,
    });
  };

  remove = () => {
    const { dispatch, review, onRemove } = this.props;

    dispatch(removeReview(review)).then(() => {
      if (typeof onRemove === 'function') {
        onRemove(review);
      }
    });
  };

  getSemanticAttrs = (semantics) => {
    const { showReviewMeta } = this.props;

    if (!showReviewMeta) {
      return undefined;
    }

    const main = {
      itemType: 'http://schema.org/Review',
      itemScope: true,
    };

    if (semantics === 'gamepage') {
      return {
        ...main,
        itemProp: 'review',
      };
    }

    return main;
  };

  expand = () => {
    this.setState({ expanded: true });
  };

  goToReview = () => {
    const { dispatch, review } = this.props;

    dispatch(push(paths.review(review.id)));
  };

  renderComments() {
    const { review = {}, loadOtherComments } = this.props;

    return <ReviewComments review={review} loadOtherComments={loadOtherComments} />;
  }

  render() {
    const {
      textLines,
      textHeight,
      size,
      ratings: allRatings,
      reactions: allReactions,
      currentUser,
      review,
      showGameInfo,
      showRating,
      showUserInfo,
      showComments,
      showEmbeds,
      fullReviewLink,
      background,
      game: propsGame,
      emojiList,
      truncateText,
      truncateStyle,
      semantics,
      your,
      showMenu,
      color,
      dispatch,
      kind,
      takeOnlyReactions,
      showReviewMeta,
      appLocale,
      isSpider,
    } = this.props;

    const { rating: ratingId, reactions: reactionsIds = [], user, created = Date.now(), game: reviewGame } = review;

    const { expanded } = this.state;

    const game = isPlainObject(propsGame) ? propsGame : reviewGame;
    const rating = allRatings.find((r) => r.id === ratingId);

    let reactions = allReactions.filter((r) => reactionsIds.includes(r.id));
    reactions = isArray(reactions) && reactions.length > 0 ? reactions : review.reactions;

    const createdDate = new Date(created);

    if (review.text === '') {
      return (
        <ReviewCardShortKind
          rating={rating}
          game={game}
          review={review}
          getClassName={this.getClassName}
          allRatings={allRatings}
        />
      );
    }

    return (
      <RenderMounted>
        {({ visible, onChildReference }) => (
          <div
            ref={(reference) => onChildReference(reference)}
            className={this.getClassName()}
            {...this.getSemanticAttrs(semantics)}
          >
            {showReviewMeta && (
              <ReviewCardMeta
                review={review}
                game={game}
                user={user}
                rating={rating}
                semantics={semantics}
                appLocale={appLocale}
              />
            )}

            {background && <ReviewCardBackground visible={visible} background={background} />}

            <div className="review-card__top-block">
              <ReviewCardGameBackground
                visible={visible}
                showGameInfo={showGameInfo}
                game={game}
                size={size}
                review={review}
                color={color}
              />
              <ReviewCardHeader
                showGameInfo={showGameInfo}
                showRating={showRating}
                game={game}
                rating={rating}
                allRatings={allRatings}
                size={size}
                currentUser={currentUser}
                review={review}
                showMenu={showMenu}
                your={your}
                remove={this.remove}
                kind={kind}
              />
              <ReviewCardText
                review={review}
                truncateText={truncateText}
                truncateStyle={truncateStyle}
                expanded={expanded}
                textLines={textLines}
                textHeight={textHeight}
                size={size}
                fullReviewLink={fullReviewLink}
                goToReview={this.goToReview}
                expand={this.expand}
                showEmbeds={showEmbeds}
                visible={visible}
                showReviewMeta={showReviewMeta}
                isSpider={isSpider}
              />
              <ReviewCardReactions reactions={reactions} takeOnly={takeOnlyReactions} />
              <div className="review-card__footer">
                {showUserInfo && (
                  <ReviewCardUserInfo user={user} review={review} createdDate={createdDate} size={size} your={your} />
                )}
                {user && <ReviewCardLikes dispatch={dispatch} currentUser={currentUser} user={user} review={review} />}
              </div>
              {emojiList}
            </div>
            {showComments && <div className="review-card__bottom-block">{this.renderComments()}</div>}
          </div>
        )}
      </RenderMounted>
    );
  }
}
