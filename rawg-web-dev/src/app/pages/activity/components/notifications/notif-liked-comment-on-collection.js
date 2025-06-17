/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';
import { hot } from 'react-hot-loader';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { bindActionCreators } from 'redux';

import repliesIcon from 'assets/icons/replies.svg';

import EventContainer from 'app/components/event-container';
import EventHeader from 'app/components/event-header';
import Comment from 'app/ui/comment';
import paths from 'config/paths';

import appHelper from 'app/pages/app/app.helper';
import {
  goToCollectionComment,
  likeCollectionComment,
  removeLikeCollectionComment,
} from 'app/components/collection-feed-item-comments/collection-feed-item-comments.actions';

import likeIcon from './icons/like.svg';

import './notif-liked-comment-on-collection.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  event: PropTypes.shape({
    user: PropTypes.object,
    games: PropTypes.object,
    comments: PropTypes.object,
    collections: PropTypes.object,
    collection_feeds: PropTypes.object,
    created: PropTypes.string,
  }).isRequired,
  personal: PropTypes.bool,

  goToCollectionComment: PropTypes.func.isRequired,
  likeCollectionComment: PropTypes.func.isRequired,
  removeLikeCollectionComment: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
  personal: true,
};

const NotifLikedCommentOnCollection = ({
  className,
  event,
  personal,
  goToCollectionComment: goToCollectionCommentFunc,
  likeCollectionComment: likeCollectionCommentFunc,
  removeLikeCollectionComment: removeLikeCollectionCommentFunc,
}) => {
  const { comments, user, games, collections, collection_feeds } = event;
  const comment = comments.results[0];
  const collection = collections.results[0];
  const collectionFeed = collection_feeds.results[0];
  const game = games.results[0];

  const userLink = (
    <Link
      className="event-header__item-link"
      to={{ pathname: paths.profile(user.slug), state: user }}
      href={paths.profile(user.slug)}
    >
      {appHelper.getName(user)}
    </Link>
  );

  const gameLink = (
    <Link
      className="event-header__item-clickable"
      to={{ pathname: paths.game(game.slug), state: game }}
      href={paths.game(game.slug)}
    >
      {game.name}
    </Link>
  );

  const collectionLink = (
    <Link
      className="event-header__item-clickable"
      to={paths.collection(collection.slug)}
      href={paths.collection(collection.slug)}
    >
      {collection.name}
    </Link>
  );

  const commentLink = (
    <span
      className="event-header__item-clickable"
      onClick={() => goToCollectionCommentFunc({ collection, comment, item: collectionFeed })}
      role="button"
      tabIndex={0}
    >
      <FormattedMessage id="shared.comment" />
    </span>
  );

  const handleCommentLike = (_, like) =>
    like
      ? likeCollectionCommentFunc({ collection, comment, item: collectionFeed })
      : removeLikeCollectionCommentFunc({ collection, comment, item: collectionFeed });

  return (
    <EventContainer
      className={cn('notif-liked-comment-on-collection', className)}
      header={
        <EventHeader user={user} avatarIcon={likeIcon} emoji={false} eventDate={event.created}>
          <FormattedMessage
            id={`feed.feed_action_favorite_comment_collection${personal ? '_personal' : ''}`}
            values={{
              user: userLink,
              comment: commentLink,
              game: gameLink,
              collection: collectionLink,
            }}
          />
        </EventHeader>
      }
    >
      <Comment
        className="notifications-comment__item"
        background={game.background_image}
        comment={comment}
        onLike={handleCommentLike}
        showReply={false}
        showRepliesCount={false}
        showAvatar={false}
        showHeader={false}
        showArrow
        arrowContent={
          <div
            onClick={() => goToCollectionCommentFunc({ collection, comment, item: collectionFeed })}
            className="notif-liked-comment-on-collection__go_to_discussion"
            role="button"
            tabIndex={0}
          >
            <SVGInline svg={repliesIcon} />
            <FormattedMessage id="shared.go_to_discussion" />
          </div>
        }
      />
    </EventContainer>
  );
};

NotifLikedCommentOnCollection.propTypes = componentPropertyTypes;
NotifLikedCommentOnCollection.defaultProps = defaultProps;

const mapDispatchToProperties = (dispatch) =>
  bindActionCreators(
    {
      goToCollectionComment,
      likeCollectionComment,
      removeLikeCollectionComment,
    },
    dispatch,
  );

const hoc = compose(
  hot(module),
  connect(
    null,
    mapDispatchToProperties,
  ),
);

export default hoc(NotifLikedCommentOnCollection);
