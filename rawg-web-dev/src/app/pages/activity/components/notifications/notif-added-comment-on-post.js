import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { bindActionCreators } from 'redux';

import onlyUpdateForKeysDeep from 'tools/only-update-for-keys-deep';

import {
  goToPostComment,
  likePostComment,
  removeLikePostComment,
  createPostComment,
} from 'app/components/post-comments/post-comments.actions';

import EventContainer from 'app/components/event-container';
import EventHeader from 'app/components/event-header';
import EventFooter from 'app/components/event-footer';
import Comment from 'app/ui/comment';
import InputComment from 'app/ui/input-comment';
import PostCard from 'app/components/post-card';
import paths from 'config/paths';

import currentUserType from 'app/components/current-user/current-user.types';
import appHelper from 'app/pages/app/app.helper';

const updater = onlyUpdateForKeysDeep(['event.id']);

const componentPropertyTypes = {
  className: PropTypes.string,
  event: PropTypes.shape({
    user: PropTypes.object,
    games: PropTypes.object,
    discussions: PropTypes.object,
    comments: PropTypes.object,
    created: PropTypes.string,
  }).isRequired,
  currentUser: currentUserType.isRequired,

  goToPostComment: PropTypes.func.isRequired,
  likePostComment: PropTypes.func.isRequired,
  removeLikePostComment: PropTypes.func.isRequired,
  createPostComment: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
};

const NotifAddedCommentOnPost = ({
  className,
  event,
  currentUser,
  goToPostComment: goToPostCommentFunc,
  likePostComment: likePostCommentFunc,
  removeLikePostComment: removeLikePostCommentFunc,
  createPostComment: createPostCommentFunc,
}) => {
  const { discussions, user, games, comments } = event;

  const post = discussions.results[0];
  const comment = comments.results[0];
  const game = games.results[0];
  const personal = post.user.id === currentUser.id;

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

  const postLink = (
    <Link className="event-header__item-link" to={paths.post(post.id)} href={paths.post(post.id)}>
      <FormattedMessage id="shared.post" />
    </Link>
  );

  const commentLink = (
    <span
      className="event-header__item-clickable"
      onClick={() => goToPostCommentFunc({ post, comment })}
      role="button"
      tabIndex={0}
    >
      <FormattedMessage id="shared.comment" />
    </span>
  );

  const handleCommentLike = (_, like) =>
    like ? likePostCommentFunc({ post, comment }) : removeLikePostCommentFunc({ post, comment });

  const handleCreate = (text) =>
    createPostCommentFunc({ post, text, parentComment: comment }).then((newComment) => {
      goToPostCommentFunc({ post, comment: newComment });
    });

  return (
    <EventContainer
      className={className}
      header={
        <EventHeader user={user} emoji={false} eventDate={event.created}>
          <FormattedMessage
            id={`feed.feed_action_added_comment_post${personal ? '_personal' : ''}`}
            values={{
              user: userLink,
              comment: commentLink,
              post: postLink,
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
        comment={comment}
        user={user}
        onLike={handleCommentLike}
        showReply={false}
        showRepliesCount={false}
        showAvatar={false}
        showHeader={false}
        showLikes={false}
      />

      <PostCard
        className="notifications-post_item"
        background={game.background_image}
        post={post}
        game={game}
        postLink={false}
        showGameInfo={false}
        showUserInfo={false}
        showComments={false}
        showMenu={false}
        showEmbeds={false}
        showGameTitle
      />
    </EventContainer>
  );
};

NotifAddedCommentOnPost.propTypes = componentPropertyTypes;
NotifAddedCommentOnPost.defaultProps = defaultProps;

const mapDispatchToProperties = (dispatch) =>
  bindActionCreators(
    {
      goToPostComment,
      likePostComment,
      removeLikePostComment,
      createPostComment,
    },
    dispatch,
  );

const hoc = compose(
  hot(module),
  updater,
  connect(
    null,
    mapDispatchToProperties,
  ),
);

export default hoc(NotifAddedCommentOnPost);
