import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { bindActionCreators } from 'redux';

import EventContainer from 'app/components/event-container';
import EventHeader from 'app/components/event-header';
import Comment from 'app/ui/comment';
import EventFooter from 'app/components/event-footer';
import InputComment from 'app/ui/input-comment';

import currentUserType from 'app/components/current-user/current-user.types';
import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';
import {
  goToPostComment,
  likePostComment,
  removeLikePostComment,
  createPostComment,
} from 'app/components/post-comments/post-comments.actions';

const componentPropertyTypes = {
  className: PropTypes.string,
  event: PropTypes.shape({
    user: PropTypes.object,
    games: PropTypes.object,
    comments: PropTypes.object,
    discussions: PropTypes.object,
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

const NotifReplyOnCommentOnPost = ({
  className,
  event,
  currentUser,
  goToPostComment: goToPostCommentFunc,
  likePostComment: likePostCommentFunc,
  removeLikePostComment: removeLikePostCommentFunc,
  createPostComment: createPostCommentFunc,
}) => {
  const { user, games, comments, discussions } = event;

  const post = discussions.results[0];
  const answer = comments.results[0];
  const comment = comments.results[1];
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

  const answerLink = (
    <span
      className="event-header__item-clickable"
      onClick={() => goToPostCommentFunc({ post, comment: answer })}
      role="button"
      tabIndex={0}
    >
      <FormattedMessage id="shared.reply" />
    </span>
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

  const handleAnswerLike = (_, like) =>
    like ? likePostCommentFunc({ post, comment: answer }) : removeLikePostCommentFunc({ post, comment: answer });

  const handleCreate = (text) =>
    createPostCommentFunc({ post, text, parentComment: answer }).then((newComment) => {
      goToPostCommentFunc({ post, comment: newComment });
    });

  return (
    <EventContainer
      className={className}
      header={
        <EventHeader user={user} emoji={false} eventDate={event.created}>
          <FormattedMessage
            id={`feed.feed_action_added_comment_post_reply${personal ? '_personal' : ''}`}
            values={{
              user: userLink,
              reply: answerLink,
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

NotifReplyOnCommentOnPost.propTypes = componentPropertyTypes;
NotifReplyOnCommentOnPost.defaultProps = defaultProps;

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
  connect(
    null,
    mapDispatchToProperties,
  ),
);

export default hoc(NotifReplyOnCommentOnPost);
