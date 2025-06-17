/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { bindActionCreators } from 'redux';

import currentUserType from 'app/components/current-user/current-user.types';

import EventContainer from 'app/components/event-container';
import EventHeader from 'app/components/event-header';
import Comment from 'app/ui/comment';
import EventFooter from 'app/components/event-footer';
import InputComment from 'app/ui/input-comment';
import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';
import {
  goToCollectionComment,
  likeCollectionComment,
  removeLikeCollectionComment,
  createCollectionComment,
} from 'app/components/collection-feed-item-comments/collection-feed-item-comments.actions';

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
  currentUser: currentUserType.isRequired,

  goToCollectionComment: PropTypes.func.isRequired,
  likeCollectionComment: PropTypes.func.isRequired,
  removeLikeCollectionComment: PropTypes.func.isRequired,
  createCollectionComment: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
};

const NotifReplyOnCommentOnCollection = ({
  className,
  event,
  currentUser,
  goToCollectionComment: goToCollectionCommentFunc,
  likeCollectionComment: likeCollectionCommentFunc,
  removeLikeCollectionComment: removeLikeCollectionCommentFunc,
  createCollectionComment: createCollectionCommentFunc,
}) => {
  const { user, games, comments, collections, collection_feeds } = event;

  const collection = collections.results[0];
  const collectionFeed = collection_feeds.results[0];
  const answer = comments.results[0];
  const comment = comments.results[1];
  const game = games.results[0];
  const personal = collection.creator.id === currentUser.id;

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
      className="event-header__item-link"
      to={{ pathname: paths.game(game.slug), state: game }}
      href={paths.game(game.slug)}
    >
      {game.name}
    </Link>
  );

  const collectionLink = (
    <Link
      className="event-header__item-link"
      to={paths.collection(collection.id)}
      href={paths.collection(collection.id)}
    >
      {collection.name}
    </Link>
  );

  const answerLink = (
    <span
      className="event-header__item-clickable"
      onClick={() => goToCollectionCommentFunc({ collection, comment: answer, item: collectionFeed })}
      role="button"
      tabIndex={0}
    >
      <FormattedMessage id="shared.reply" />
    </span>
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

  const handleAnswerLike = (_, like) =>
    like
      ? likeCollectionCommentFunc({ collection, comment: answer, item: collectionFeed })
      : removeLikeCollectionCommentFunc({
          collection,
          comment: answer,
          item: collectionFeed,
        });

  const handleCreate = (text) =>
    createCollectionCommentFunc({
      collection,
      text,
      parentComment: answer,
      item: collectionFeed,
    }).then((newComment) => {
      goToCollectionCommentFunc({
        collection,
        comment: newComment,
        item: collectionFeed,
      });
    });

  return (
    <EventContainer
      className={className}
      header={
        <EventHeader user={user} emoji={false} eventDate={event.created}>
          <FormattedMessage
            id={`feed.feed_action_added_comment_collection_reply${personal ? '_personal' : ''}`}
            values={{
              user: userLink,
              reply: answerLink,
              comment: commentLink,
              collection: collectionLink,
              game: gameLink,
            }}
          />
        </EventHeader>
      }
      footer={
        <EventFooter>
          <InputComment placeholder="shared.comment_reply_three_dots" onSubmit={handleCreate} />
        </EventFooter>
      }
    >
      <Comment
        className="notifications-comment__item__just-text"
        comment={answer}
        onLike={handleAnswerLike}
        showReply={false}
        showRepliesCount={false}
        showAvatar={false}
        showHeader={false}
        showLikes={false}
      />

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
      />
    </EventContainer>
  );
};

NotifReplyOnCommentOnCollection.propTypes = componentPropertyTypes;
NotifReplyOnCommentOnCollection.defaultProps = defaultProps;

const mapDispatchToProperties = (dispatch) =>
  bindActionCreators(
    {
      goToCollectionComment,
      likeCollectionComment,
      removeLikeCollectionComment,
      createCollectionComment,
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

export default hoc(NotifReplyOnCommentOnCollection);
