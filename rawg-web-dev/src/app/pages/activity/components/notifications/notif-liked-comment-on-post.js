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

import './notif-liked-comment-on-post.styl';
import appHelper from 'app/pages/app/app.helper';
import {
  goToPostComment,
  likePostComment,
  removeLikePostComment,
} from 'app/components/post-comments/post-comments.actions';

import likeIcon from './icons/like.svg';

const componentPropertyTypes = {
  className: PropTypes.string,
  event: PropTypes.shape({
    user: PropTypes.object,
    games: PropTypes.object,
    comments: PropTypes.object,
    reviews: PropTypes.object,
    discussions: PropTypes.object,
    created: PropTypes.string,
  }).isRequired,
  personal: PropTypes.bool,

  goToPostComment: PropTypes.func.isRequired,
  likePostComment: PropTypes.func.isRequired,
  removeLikePostComment: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
  personal: true,
};

const NotifLikedCommentOnPost = ({
  className,
  event,
  personal,
  goToPostComment: goToPostCommentFunc,
  likePostComment: likePostCommentFunc,
  removeLikePostComment: removeLikePostCommentFunc,
}) => {
  const { discussions, user, games, comments } = event;
  const post = discussions.results[0];
  const comment = comments.results[0];
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
      className="event-header__item-link"
      to={{ pathname: paths.game(game.slug), state: game }}
      href={paths.game(game.slug)}
    >
      {game.name}
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

  return (
    <EventContainer
      className={cn('notif-liked-comment-on-post', className)}
      header={
        <EventHeader user={user} avatarIcon={likeIcon} emoji={false} eventDate={event.created}>
          <FormattedMessage
            id={`feed.feed_action_favorite_comment_post${personal ? '_personal' : ''}`}
            values={{
              user: userLink,
              comment: commentLink,
              game: gameLink,
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
            onClick={() => goToPostCommentFunc({ post, comment })}
            className="notif-liked-comment-on-post__go_to_discussion"
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

NotifLikedCommentOnPost.propTypes = componentPropertyTypes;
NotifLikedCommentOnPost.defaultProps = defaultProps;

const mapDispatchToProperties = (dispatch) =>
  bindActionCreators(
    {
      goToPostComment,
      likePostComment,
      removeLikePostComment,
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

export default hoc(NotifLikedCommentOnPost);
