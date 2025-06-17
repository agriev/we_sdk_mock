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
import './post-comments.styl';

import {
  addPostComments,
  loadPostCommentsReplies,
  loadPostComments,
  createPostComment,
  editPostComment,
  removePostComment,
  likePostComment,
  removeLikePostComment,
} from './post-comments.actions';

const postCommentsPropertyTypes = {
  post: PropTypes.shape().isRequired,
  loadOtherComments: PropTypes.oneOf(['here', 'postpage']),

  // пропсы из hoc'ов
  dispatch: PropTypes.func.isRequired,
  postComments: PropTypes.shape().isRequired,
};

const defaultProps = {
  loadOtherComments: 'postpage',
};

@connect((state) => ({
  postComments: state.postComments,
}))
export default class PostComments extends Component {
  static propTypes = postCommentsPropertyTypes;

  static defaultProps = defaultProps;

  componentDidMount() {
    const { dispatch, post = {} } = this.props;

    if (post.id && post.comments) {
      dispatch(addPostComments({ post }));
    }
  }

  componentDidUpdate(previousProperties) {
    const { dispatch } = this.props;

    if (this.props.post.id && this.props.post.comments && !previousProperties.post.id) {
      dispatch(addPostComments({ post: this.props.post }));
    }
  }

  handleCreate = (parentComment, text) => {
    const { dispatch, post } = this.props;

    return dispatch(createPostComment({ post, text, parentComment }));
  };

  handleEdit = (comment, text) => {
    const { dispatch, post } = this.props;

    return dispatch(editPostComment({ post, comment, text }));
  };

  handleRemove = (comment) => {
    const { dispatch, post } = this.props;

    return dispatch(removePostComment({ post, comment }));
  };

  handleLoadReplies = (comment, page = 1, { shift, push } = {}) => {
    const { dispatch, post } = this.props;

    return dispatch(
      loadPostCommentsReplies({
        post,
        comment,
        page,
        shift,
        push,
      }),
    );
  };

  handleLike = (comment, like) => {
    const { dispatch, post } = this.props;

    return like ? dispatch(likePostComment({ post, comment })) : dispatch(removeLikePostComment({ post, comment }));
  };

  handleLoad = (page, { shift = false, push = false } = {}) => {
    const { dispatch, post } = this.props;

    dispatch(
      loadPostComments({
        post,
        page,
        shift,
        push,
      }),
    );
  };

  handleLoadRemainingComments = () => {
    this.handleLoad(1);
  };

  render() {
    const { post, postComments: allPostComments, loadOtherComments } = this.props;
    const postComments = allPostComments[post.id] || {};
    const allComments = postComments.results || [];
    const comments = allComments.filter((comment) => !comment.parent);

    return (
      <CommentsList className="post-comments" useId={!post.comments}>
        {!post.comments && postComments.next && (
          <div
            className="comments-list__load comments-list__load_next"
            onClick={() => this.handleLoad(postComments.next, { shift: true })}
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
            {postComments.childrenNext && (
              <div
                className="comments-list__load comments-list__load_next comments-list__load_children"
                onClick={() =>
                  this.handleLoadReplies(postComments.childrenNext, {
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
            {postComments.childrenPrevious && (
              <div
                className="comments-list__load comments-list__load_previous comments-list__load_children"
                onClick={() =>
                  this.handleLoadReplies(postComments.childrenPrevious, {
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
        {!post.comments && postComments.previous && (
          <div
            className="comments-list__load comments-list__load_previous"
            onClick={() => this.handleLoad(postComments.previous, { push: true })}
            role="button"
            tabIndex={0}
          >
            <FormattedMessage id="shared.comment_load_previous" />
          </div>
        )}
        <InputComment value="" onSubmit={(text) => this.handleCreate(null, text)} />
        {!_isEmpty(post.comments) && post.comments_parent_count > comments.length && (
          <div className="comments-list__load-wrapper">
            {loadOtherComments === 'postpage' && (
              <Link
                className="comments-list__load comments-list__load_all"
                to={paths.postComments(post.id)}
                href={paths.postComments(post.id)}
              >
                <FormattedMessage
                  id="shared.comment_load_all"
                  values={{ count: post.comments_parent_count - comments.length }}
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
                  values={{ count: post.comments_parent_count - comments.length }}
                />
              </div>
            )}
          </div>
        )}
      </CommentsList>
    );
  }
}
