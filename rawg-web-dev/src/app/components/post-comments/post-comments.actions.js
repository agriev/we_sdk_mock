/* eslint-disable no-console */

import urlParse from 'url-parse';
import { push as routerPush } from 'react-router-redux';

import fetch from 'tools/fetch';

import paths from 'config/paths';

export const POST_COMMENTS_ADD_SUCCESS = 'POST_COMMENTS_ADD_SUCCESS';
export const POST_COMMENTS_REPLIES_LOAD_SUCCESS = 'POST_COMMENTS_REPLIES_LOAD_SUCCESS';
export const POST_COMMENTS_LOAD_SUCCESS = 'POST_COMMENTS_LOAD_SUCCESS';
export const POST_COMMENT_CREATE_SUCCESS = 'POST_COMMENT_CREATE_SUCCESS';
export const POST_COMMENT_CREATE_FAIL = 'POST_COMMENT_CREATE_FAIL';
export const POST_COMMENT_EDIT_SUCCESS = 'POST_COMMENT_EDIT_SUCCESS';
export const POST_COMMENT_EDIT_FAIL = 'POST_COMMENT_EDIT_FAIL';
export const POST_COMMENT_REMOVE_SUCCESS = 'POST_COMMENT_REMOVE_SUCCESS';
export const POST_COMMENT_REMOVE_FAIL = 'POST_COMMENT_REMOVE_FAIL';

export function goToPostComment({ post, comment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/discussions/${post.id}/comments/${comment.id}/page`;

    try {
      const pages = await fetch(uri, {
        method: 'get',
        state,
      });

      dispatch(routerPush(paths.postComment(post.id, comment.id, JSON.stringify(pages))));
    } catch (error) {
      console.error(error);
    }
  };
}

export function addPostComments({ post }) {
  return async (dispatch /* , getState */) => {
    dispatch({
      type: POST_COMMENTS_ADD_SUCCESS,
      data: {
        post,
      },
    });
  };
}

export function loadPostCommentsReplies({ post, comment, page = 1, shift = false, push = false }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/discussions/${post.id}/comments/${comment.id}/children`;

    try {
      const comments = await fetch(uri, {
        method: 'get',
        data: {
          page,
        },
        state,
      });

      dispatch({
        type: POST_COMMENTS_REPLIES_LOAD_SUCCESS,
        data: {
          post,
          comments: comments.results.map((c) => ({ ...c, parent: comment.id })),
          next: comments.next,
          previous: comments.previous,
        },
        shift,
        push,
      });
    } catch (error) {
      console.error(error);
    }
  };
}

export function loadPostComments({ post, page = 1, shift = false, push = false }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/discussions/${post.id}/comments`;

    try {
      const res = await fetch(uri, {
        method: 'get',
        data: {
          page,
        },
        state,
      });

      const url = res.next && urlParse(res.next, true);

      dispatch({
        type: POST_COMMENTS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
          post,
        },
        push,
        shift,
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  };
}

export function createPostComment({ post, text, parentComment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/discussions/${post.id}/comments`;
    const data = { text };

    if (parentComment) {
      data.parent = parentComment.id;
    }

    try {
      const comment = await fetch(uri, {
        method: 'post',
        data,
        state,
      });

      dispatch({
        type: POST_COMMENT_CREATE_SUCCESS,
        data: {
          post,
          comment,
        },
      });

      return comment;
    } catch (error) {
      dispatch({
        type: POST_COMMENT_CREATE_FAIL,
      });
      console.error(error);
      return undefined;
    }
  };
}

export function editPostComment({ post, comment, text }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/discussions/${post.id}/comments/${comment.id}`;

    try {
      const updatedComment = await fetch(uri, {
        method: 'patch',
        data: {
          text,
        },
        state,
      });

      dispatch({
        type: POST_COMMENT_EDIT_SUCCESS,
        data: {
          post,
          comment: updatedComment,
          text,
        },
      });

      return updatedComment;
    } catch (error) {
      dispatch({
        type: POST_COMMENT_EDIT_FAIL,
      });
      console.error(error);
      return undefined;
    }
  };
}

export function removePostComment({ post, comment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/discussions/${post.id}/comments/${comment.id}`;

    try {
      await fetch(uri, {
        method: 'delete',
        parse: false,
        state,
      });

      dispatch({
        type: POST_COMMENT_REMOVE_SUCCESS,
        data: {
          post,
          comment,
        },
      });
    } catch (error) {
      dispatch({
        type: POST_COMMENT_REMOVE_FAIL,
      });
      console.error(error);
    }
  };
}

export function likePostComment({ post, comment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/discussions/${post.id}/comments/${comment.id}/likes`;

    try {
      await fetch(uri, {
        method: 'post',
        state,
      });
    } catch (error) {
      console.error(error);
    }
  };
}

export function removeLikePostComment({ post, comment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const { currentUser } = state;
    const uri = `/api/discussions/${post.id}/comments/${comment.id}/likes/${currentUser.id}`;

    try {
      await fetch(uri, {
        method: 'delete',
        parse: false,
        state,
      });
    } catch (error) {
      console.error(error);
    }
  };
}
