import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import InputComment from 'app/ui/input-comment';
import Comment from 'app/ui/comment';
import CommentsList from 'app/ui/comments-list';

import {
  addCollectionComments,
  loadCollectionCommentsReplies,
  loadCollectionComments,
  createCollectionComment,
  editCollectionComment,
  removeCollectionComment,
  likeCollectionComment,
  removeLikeCollectionComment,
} from './collection-feed-item-comments.actions';

const collectionFeedItemCommentsPropertyTypes = {
  collection: PropTypes.shape().isRequired,
  item: PropTypes.shape().isRequired,
  className: PropTypes.string,
  dispatch: PropTypes.func.isRequired,
  collectionComments: PropTypes.shape().isRequired,
};

const defaultProps = {
  className: '',
};

@connect((state) => ({
  collectionComments: state.collectionComments,
}))
export default class CollectionFeedItemComments extends Component {
  static propTypes = collectionFeedItemCommentsPropertyTypes;

  static defaultProps = defaultProps;

  componentDidMount() {
    const { dispatch, item = {} } = this.props;

    if (item.id && item.comments) {
      dispatch(addCollectionComments({ item }));
    }
  }

  componentDidUpdate(prevProps) {
    const { dispatch } = this.props;

    if (prevProps.item.id && prevProps.item.comments && !this.props.item.id) {
      dispatch(addCollectionComments({ item: prevProps.item }));
    }
  }

  handleCreate = (parentComment, text) => {
    const { dispatch, collection, item } = this.props;

    return dispatch(
      createCollectionComment({
        collection,
        item,
        text,
        parentComment,
      }),
    );
  };

  handleEdit = (comment, text) => {
    const { dispatch, collection, item } = this.props;

    return dispatch(
      editCollectionComment({
        collection,
        item,
        comment,
        text,
      }),
    );
  };

  handleRemove = (comment) => {
    const { dispatch, collection, item } = this.props;

    return dispatch(removeCollectionComment({ collection, item, comment }));
  };

  handleLoadReplies = (comment, page = 1, { shift, push } = {}) => {
    const { dispatch, collection, item } = this.props;

    return dispatch(
      loadCollectionCommentsReplies({
        collection,
        item,
        comment,
        page,
        shift,
        push,
      }),
    );
  };

  handleLike = (comment, like) => {
    const { dispatch, collection, item } = this.props;

    return like
      ? dispatch(likeCollectionComment({ collection, item, comment }))
      : dispatch(removeLikeCollectionComment({ collection, item, comment }));
  };

  handleLoad = (page, { shift, push }) => {
    const { dispatch, collection, item } = this.props;

    dispatch(
      loadCollectionComments({
        collection,
        item,
        page,
        shift,
        push,
      }),
    );
  };

  render() {
    const { item, collectionComments: allCollectionComments, className } = this.props;
    const collectionComments = allCollectionComments[item.id] || {};
    const allComments = collectionComments.results || [];
    const comments = allComments.filter((comment) => !comment.parent);

    return (
      <CommentsList className={['collection-comments', className].join(' ')} useId>
        {collectionComments.next && (
          <div
            className="comments-list__load comments-list__load_next"
            onClick={() => this.handleLoad(collectionComments.next, { shift: true })}
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
            {collectionComments.childrenNext && (
              <div
                className="comments-list__load comments-list__load_next comments-list__load_children"
                onClick={() =>
                  this.handleLoadReplies(collectionComments.childrenNext, {
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
            {collectionComments.childrenPrevious && (
              <div
                className="comments-list__load comments-list__load_previous comments-list__load_children"
                onClick={() =>
                  this.handleLoadReplies(collectionComments.childrenPrevious, {
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
        {collectionComments.previous && (
          <div
            className="comments-list__load comments-list__load_previous"
            onClick={() => this.handleLoad(collectionComments.previous, { push: true })}
            role="button"
            tabIndex={0}
          >
            <FormattedMessage id="shared.comment_load_previous" />
          </div>
        )}
        <InputComment value="" onSubmit={(text) => this.handleCreate(null, text)} />
      </CommentsList>
    );
  }
}
