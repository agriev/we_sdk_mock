import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import InputComment from 'app/ui/input-comment';

import Comment from 'app/ui/comment';
import CommentsList from 'app/ui/comments-list';

import './game-card-comments.styl';

import {
  loadGameCardCommentsReplies,
  loadGameCardComments,
  createGameCardComment,
  editGameCardComment,
  removeGameCardComment,
  likeGameCardComment,
  removeLikeGameCardComment,
} from './game-card-comments.actions';

const reviewCommentsPropertyTypes = {
  dispatch: PropTypes.func.isRequired,
  comments: PropTypes.shape().isRequired,
  gameSlug: PropTypes.string.isRequired,
};

const defaultProps = {
  //
};

export default class GameCardComments extends Component {
  static propTypes = reviewCommentsPropertyTypes;

  static defaultProps = defaultProps;

  handleCreate = (parentComment, text) => {
    const { dispatch, gameSlug } = this.props;

    return dispatch(createGameCardComment({ gameSlug, text, parentComment }));
  };

  handleEdit = (comment, text) => {
    const { dispatch, gameSlug } = this.props;

    return dispatch(editGameCardComment({ gameSlug, comment, text }));
  };

  handleRemove = (comment) => {
    const { dispatch, gameSlug } = this.props;

    return dispatch(removeGameCardComment({ gameSlug, comment }));
  };

  handleLoadReplies = (comment, page = 1, { shift, push } = {}) => {
    const { dispatch, gameSlug } = this.props;

    return dispatch(
      loadGameCardCommentsReplies({
        gameSlug,
        comment,
        page,
        shift,
        push,
      }),
    );
  };

  handleLike = (comment, like) => {
    const { dispatch, gameSlug } = this.props;

    return like
      ? dispatch(likeGameCardComment({ gameSlug, comment }))
      : dispatch(removeLikeGameCardComment({ gameSlug, comment }));
  };

  handleLoad = (page, { shift = false, push = false, replace = false } = {}) => {
    const { dispatch, gameSlug } = this.props;

    dispatch(
      loadGameCardComments({
        gameSlug,
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
    const { comments } = this.props;

    if (!comments) {
      return null;
    }

    const mainComments = comments.results.filter((comment) => !comment.parent);

    return (
      <CommentsList className="review-comments">
        {comments.next && (
          <div
            className="comments-list__load comments-list__load_next"
            onClick={() => this.handleLoad(comments.next, { shift: true })}
            role="button"
            tabIndex={0}
          >
            <FormattedMessage id="shared.comment_load_next" />
          </div>
        )}
        {mainComments.map((comment) => (
          <div key={comment.id}>
            <Comment
              comment={comment}
              onCreate={this.handleCreate}
              onEdit={this.handleEdit}
              onRemove={this.handleRemove}
              onLoadReplies={this.handleLoadReplies}
              onLike={this.handleLike}
            />
            {comments.results
              .filter((replyComment) => replyComment.parent === comment.id)
              .map((childComment) => (
                <Comment
                  key={childComment.id}
                  comment={childComment}
                  onCreate={this.handleCreate}
                  onEdit={this.handleEdit}
                  onRemove={this.handleRemove}
                  onLoadReplies={this.handleLoadReplies}
                  onLike={this.handleLike}
                  child
                />
              ))}
          </div>
        ))}
        {comments.previous && (
          <div
            className="comments-list__load comments-list__load_previous"
            onClick={() => this.handleLoad(comments.previous, { push: true })}
            role="button"
            tabIndex={0}
          >
            <FormattedMessage id="shared.comment_load_previous" />
          </div>
        )}
        <InputComment
          value=""
          onSubmit={(text) => this.handleCreate(null, text)}
          placeholder="discover.comment_input_placeholder"
          role="button"
          tabIndex={0}
        />
      </CommentsList>
    );
  }
}
