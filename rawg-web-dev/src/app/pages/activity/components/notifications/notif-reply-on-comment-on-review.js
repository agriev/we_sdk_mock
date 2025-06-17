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
  goToReviewComment,
  likeReviewComment,
  removeLikeReviewComment,
  createReviewComment,
} from 'app/components/review-comments/review-comments.actions';

const componentPropertyTypes = {
  className: PropTypes.string,
  event: PropTypes.shape({
    user: PropTypes.object,
    games: PropTypes.object,
    comments: PropTypes.object,
    reviews: PropTypes.object,
    created: PropTypes.string,
  }).isRequired,
  currentUser: currentUserType.isRequired,

  goToReviewComment: PropTypes.func.isRequired,
  likeReviewComment: PropTypes.func.isRequired,
  removeLikeReviewComment: PropTypes.func.isRequired,
  createReviewComment: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
};

const NotifReplyOnCommentOnReview = ({
  className,
  event,
  currentUser,
  goToReviewComment: goToReviewCommentFunc,
  likeReviewComment: likeReviewCommentFunc,
  removeLikeReviewComment: removeLikeReviewCommentFunc,
  createReviewComment: createReviewCommentFunc,
}) => {
  const { user, games, comments, reviews } = event;

  const review = reviews.results[0];
  const answer = comments.results[0];
  const comment = comments.results[1];
  const game = games.results[0];
  const personal = review.user === currentUser.id;

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

  const reviewLink = (
    <Link className="event-header__item-link" to={paths.review(review.id)} href={paths.review(review.id)}>
      <FormattedMessage id="shared.review" />
    </Link>
  );

  const answerLink = (
    <span
      className="event-header__item-clickable"
      onClick={() => goToReviewCommentFunc({ review, comment: answer })}
      role="button"
      tabIndex={0}
    >
      <FormattedMessage id="shared.reply" />
    </span>
  );

  const commentLink = (
    <span
      className="event-header__item-clickable"
      onClick={() => goToReviewCommentFunc({ review, comment })}
      role="button"
      tabIndex={0}
    >
      <FormattedMessage id="shared.comment" />
    </span>
  );

  const handleCommentLike = (_, like) =>
    like ? likeReviewCommentFunc({ review, comment }) : removeLikeReviewCommentFunc({ review, comment });

  const handleAnswerLike = (_, like) =>
    like
      ? likeReviewCommentFunc({ review, comment: answer })
      : removeLikeReviewCommentFunc({ review, comment: answer });

  const handleCreate = (text) =>
    createReviewCommentFunc({ review, text, parentComment: answer }).then((newComment) => {
      goToReviewCommentFunc({ review, comment: newComment });
    });

  return (
    <EventContainer
      className={className}
      header={
        <EventHeader user={user} emoji={false} eventDate={event.created}>
          <FormattedMessage
            id={`feed.feed_action_added_comment_review_reply${personal ? '_personal' : ''}`}
            values={{
              user: userLink,
              reply: answerLink,
              comment: commentLink,
              review: reviewLink,
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

NotifReplyOnCommentOnReview.propTypes = componentPropertyTypes;
NotifReplyOnCommentOnReview.defaultProps = defaultProps;

const mapDispatchToProperties = (dispatch) =>
  bindActionCreators(
    {
      goToReviewComment,
      likeReviewComment,
      removeLikeReviewComment,
      createReviewComment,
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

export default hoc(NotifReplyOnCommentOnReview);
