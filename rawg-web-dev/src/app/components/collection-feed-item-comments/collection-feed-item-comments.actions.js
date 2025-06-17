/* eslint-disable no-console */

import urlParse from 'url-parse';
import { push as routerPush } from 'react-router-redux';

import fetch from 'tools/fetch';

import paths from 'config/paths';

export const COLLECTION_COMMENTS_ADD_SUCCESS = 'COLLECTION_COMMENTS_ADD_SUCCESS';
export const COLLECTION_COMMENTS_REPLIES_LOAD_SUCCESS = 'COLLECTION_COMMENTS_REPLIES_LOAD_SUCCESS';
export const COLLECTION_COMMENTS_LOAD_SUCCESS = 'COLLECTION_COMMENTS_LOAD_SUCCESS';
export const COLLECTION_COMMENT_CREATE_SUCCESS = 'COLLECTION_COMMENT_CREATE_SUCCESS';
export const COLLECTION_COMMENT_CREATE_FAIL = 'COLLECTION_COMMENT_CREATE_FAIL';
export const COLLECTION_COMMENT_EDIT_SUCCESS = 'COLLECTION_COMMENT_EDIT_SUCCESS';
export const COLLECTION_COMMENT_EDIT_FAIL = 'COLLECTION_COMMENT_EDIT_FAIL';
export const COLLECTION_COMMENT_REMOVE_SUCCESS = 'COLLECTION_COMMENT_REMOVE_SUCCESS';
export const COLLECTION_COMMENT_REMOVE_FAIL = 'COLLECTION_COMMENT_REMOVE_FAIL';

export function goToCollectionComment({ collection, item, comment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const itemPageUri = `/api/collections/${collection.id}/feed/${item.id}/page`;
    const commentPageUri = `/api/collections/${collection.id}/feed/${item.id}/comments/${comment.id}/page`;

    const [itemPage, commentPage] = await Promise.all([
      fetch(itemPageUri, {
        method: 'get',
        state,
      }),
      fetch(commentPageUri, {
        method: 'get',
        state,
      }),
    ]);

    dispatch(
      routerPush(
        paths.collectionComment(
          collection.slug,
          item.id,
          comment.id,
          JSON.stringify({ ...itemPage }),
          JSON.stringify({ ...commentPage }),
        ),
      ),
    );
  };
}

export function addCollectionComments({ item }) {
  return async (dispatch /* , getState */) => {
    dispatch({
      type: COLLECTION_COMMENTS_ADD_SUCCESS,
      data: {
        item,
      },
    });
  };
}

export function loadCollectionCommentsReplies({ collection, item, comment, page = 1, shift = false, push = false }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/collections/${collection.id}/feed/${item.id}/comments/${comment.id}/children`;

    const comments = await fetch(uri, {
      method: 'get',
      data: {
        page,
      },
      state,
    });

    dispatch({
      type: COLLECTION_COMMENTS_REPLIES_LOAD_SUCCESS,
      data: {
        collection,
        item,
        comments: comments.results.map((c) => ({ ...c, parent: comment.id })),
        next: comments.next,
        previous: comments.previous,
      },
      shift,
      push,
    });
  };
}

export function loadCollectionComments({ collection, item, page = 1, shift = false, push = false }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/collections/${collection.id}/feed/${item.id}/comments`;

    const res = await fetch(uri, {
      method: 'get',
      data: {
        page,
      },
      state,
    });

    const url = res.next && urlParse(res.next, true);

    dispatch({
      type: COLLECTION_COMMENTS_LOAD_SUCCESS,
      data: {
        ...res,
        next: (url && +url.query.page) || null,
        collection,
        item,
      },
      push,
      shift,
    });
  };
}

export function createCollectionComment({ collection, item, text, parentComment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/collections/${collection.id}/feed/${item.id}/comments`;
    const data = { text };

    if (parentComment) {
      data.parent = parentComment.id;
    }

    const comment = await fetch(uri, {
      method: 'post',
      data,
      state,
    });

    dispatch({
      type: COLLECTION_COMMENT_CREATE_SUCCESS,
      data: {
        collection,
        item,
        comment,
      },
    });

    return comment;
  };
}

export function editCollectionComment({ collection, item, comment, text }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/collections/${collection.id}/feed/${item.id}/comments/${comment.id}`;

    const updatedComment = await fetch(uri, {
      method: 'patch',
      data: {
        text,
      },
      state,
    });

    dispatch({
      type: COLLECTION_COMMENT_EDIT_SUCCESS,
      data: {
        collection,
        item,
        comment: updatedComment,
        text,
      },
    });

    return updatedComment;
  };
}

export function removeCollectionComment({ collection, item, comment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/collections/${collection.id}/feed/${item.id}/comments/${comment.id}`;

    await fetch(uri, {
      method: 'delete',
      parse: false,
      state,
    });

    dispatch({
      type: COLLECTION_COMMENT_REMOVE_SUCCESS,
      data: {
        collection,
        item,
        comment,
      },
    });
  };
}

export function likeCollectionComment({ collection, item, comment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/collections/${collection.id}/feed/${item.id}/comments/${comment.id}/likes`;

    await fetch(uri, {
      method: 'post',
      state,
    });
  };
}

export function removeLikeCollectionComment({ collection, item, comment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const { currentUser } = state;
    const uri = `/api/collections/${collection.id}/feed/${item.id}/comments/${comment.id}/likes/${currentUser.id}`;

    await fetch(uri, {
      method: 'delete',
      parse: false,
      state,
    });
  };
}
