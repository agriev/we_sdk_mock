import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import _isEmpty from 'lodash/isEmpty';

import paths from 'config/paths';
import InputComment from 'app/ui/input-comment';
import Comment from 'app/ui/comment';
import CommentsList from 'app/ui/comments-list';
import './review-comments.styl';

import {
  addReviewComments,
  loadReviewCommentsReplies,
  loadReviewComments,
  createReviewComment,
  editReviewComment,
  removeReviewComment,
  likeReviewComment,
  removeLikeReviewComment,
} from './review-comments.actions';

const reviewCommentsPropertyTypes = {
  review: PropTypes.shape().isRequired,
  loadOtherComments: PropTypes.oneOf(['here', 'reviewpage']),

  dispatch: PropTypes.func.isRequired,
  reviewComments: PropTypes.shape().isRequired,
};

const defaultProps = {
  loadOtherComments: 'reviewpage',
};

@connect((state) => ({
  reviewComments: state.reviewComments,
}))
export default class ReviewComments extends Component {
  static propTypes = reviewCommentsPropertyTypes;

  static defaultProps = defaultProps;

  componentDidMount() {
    const { dispatch, review = {} } = this.props;

    if (review.id && review.comments) {
      dispatch(addReviewComments({ review }));
    }
  }

  componentDidUpdate(previousProperties) {
    const { dispatch } = this.props;

    if (this.props.review.id && this.props.review.comments && !previousProperties.review.id) {
      dispatch(addReviewComments({ review: this.props.review }));
    }
  }

  handleCreate = (parentComment, text) => {
    const { dispatch, review } = this.props;

    return dispatch(createReviewComment({ review, text, parentComment }));
  };

  handleEdit = (comment, text) => {
    const { dispatch, review } = this.props;

    return dispatch(editReviewComment({ review, comment, text }));
  };

  handleRemove = (comment) => {
    const { dispatch, review } = this.props;

    return dispatch(removeReviewComment({ review, comment }));
  };

  handleLoadReplies = (comment, page = 1, { shift, push } = {}) => {
    const { dispatch, review } = this.props;

    return dispatch(
      loadReviewCommentsReplies({
        review,
        comment,
        page,
        shift,
        push,
      }),
    );
  };

  handleLike = (comment, like) => {
    const { dispatch, review } = this.props;

    return like
      ? dispatch(likeReviewComment({ review, comment }))
      : dispatch(removeLikeReviewComment({ review, comment }));
  };

  handleLoad = (page, { shift = false, push = false, replace = false } = {}) => {
    const { dispatch, review } = this.props;

    dispatch(
      loadReviewComments({
        review,
        page,
        shift,
        push,
        replace,
      }),
    );
  };

  handleLoadRemainingComments = () => {
    this.handleLoad(1);
  };

  render() {
    const { review, reviewComments: allReviewComments, loadOtherComments } = this.props;
    const reviewComments = allReviewComments[review.id] || {};
    const allComments = reviewComments.results || [];
    const comments = allComments.filter((comment) => !comment.parent);

    return (
      <CommentsList className="review-comments" useId={!review.comments}>
        {!review.comments && reviewComments.next && (
          <div
            className="comments-list__load comments-list__load_next"
            onClick={() => this.handleLoad(reviewComments.next, { shift: true })}
            role="button"
            tabIndex={0}
          >
            <FormattedMessage id="shared.comment_load_next" />
          </div>
        )}
        {comments.map((comment) => (
          <div key={comment.id}>
            <Comment
              comment={comment}
              onCreate={this.handleCreate}
              onEdit={this.handleEdit}
              onRemove={this.handleRemove}
              onLoadReplies={this.handleLoadReplies}
              onLike={this.handleLike}
              comments={comments}
            />
            {reviewComments.childrenNext && (
              <div
                className="comments-list__load comments-list__load_next comments-list__load_children"
                onClick={() =>
                  this.handleLoadReplies(reviewComments.childrenNext, {
                    shift: true,
                  })
                }
                role="button"
                tabIndex={0}
              >
                <FormattedMessage id="shared.comment_load_next" />
              </div>
            )}
            {allComments
              .filter((replyComment) => replyComment.parent === comment.id)
              .map((childComment) => (
                <Comment
                  comment={childComment}
                  onCreate={this.handleCreate}
                  onEdit={this.handleEdit}
                  onRemove={this.handleRemove}
                  onLoadReplies={this.handleLoadReplies}
                  onLike={this.handleLike}
                  child
                  key={childComment.id}
                  comments={comments}
                />
              ))}
            {reviewComments.childrenPrevious && (
              <div
                className="comments-list__load comments-list__load_previous comments-list__load_children"
                onClick={() =>
                  this.handleLoadReplies(reviewComments.childrenPrevious, {
                    push: true,
                  })
                }
                role="button"
                tabIndex={0}
              >
                <FormattedMessage id="shared.comment_load_previous" />
              </div>
            )}
          </div>
        ))}
        {!review.comments && reviewComments.previous && (
          <div
            className="comments-list__load comments-list__load_previous"
            onClick={() => this.handleLoad(reviewComments.previous, { push: true })}
            role="button"
            tabIndex={0}
          >
            <FormattedMessage id="shared.comment_load_previous" />
          </div>
        )}
        <InputComment value="" onSubmit={(text) => this.handleCreate(null, text)} role="button" tabIndex={0} />
        {!_isEmpty(review.comments) && review.comments_parent_count > comments.length && (
          <div className="comments-list__load-wrapper">
            {loadOtherComments === 'reviewpage' && (
              <Link
                className="comments-list__load comments-list__load_all"
                to={paths.reviewComments(review.id)}
                href={paths.reviewComments(review.id)}
              >
                <FormattedMessage
                  id="shared.comment_load_all"
                  values={{ count: review.comments_parent_count - comments.length }}
                />
              </Link>
            )}
            {loadOtherComments === 'here' && (
              <div
                className="comments-list__load comments-list__load_all"
                onClick={this.handleLoadRemainingComments}
                role="button"
                tabIndex={0}
              >
                <FormattedMessage
                  id="shared.comment_load_all"
                  values={{ count: review.comments_parent_count - comments.length }}
                />
              </div>
            )}
          </div>
        )}
      </CommentsList>
    );
  }
}
