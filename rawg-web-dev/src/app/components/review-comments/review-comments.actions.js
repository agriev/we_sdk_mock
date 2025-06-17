/* eslint-disable no-console */

import urlParse from 'url-parse';
import { push as routerPush } from 'react-router-redux';

import fetch from 'tools/fetch';

import paths from 'config/paths';

export const REVIEW_COMMENTS_ADD_SUCCESS = 'REVIEW_COMMENTS_ADD_SUCCESS';
export const REVIEW_COMMENTS_REPLIES_LOAD_SUCCESS = 'REVIEW_COMMENTS_REPLIES_LOAD_SUCCESS';
export const REVIEW_COMMENTS_LOAD_SUCCESS = 'REVIEW_COMMENTS_LOAD_SUCCESS';
export const REVIEW_COMMENT_CREATE_SUCCESS = 'REVIEW_COMMENT_CREATE_SUCCESS';
export const REVIEW_COMMENT_CREATE_FAIL = 'REVIEW_COMMENT_CREATE_FAIL';
export const REVIEW_COMMENT_EDIT_SUCCESS = 'REVIEW_COMMENT_EDIT_SUCCESS';
export const REVIEW_COMMENT_EDIT_FAIL = 'REVIEW_COMMENT_EDIT_FAIL';
export const REVIEW_COMMENT_REMOVE_SUCCESS = 'REVIEW_COMMENT_REMOVE_SUCCESS';
export const REVIEW_COMMENT_REMOVE_FAIL = 'REVIEW_COMMENT_REMOVE_FAIL';

export function goToReviewComment({ review, comment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/reviews/${review.id}/comments/${comment.id}/page`;

    try {
      const pages = await fetch(uri, {
        method: 'get',
        state,
      });

      dispatch(routerPush(paths.reviewComment(review.id, comment.id, JSON.stringify(pages))));
    } catch (error) {
      console.error(error);
    }
  };
}

export function addReviewComments({ review }) {
  return async (dispatch /* , getState */) => {
    dispatch({
      type: REVIEW_COMMENTS_ADD_SUCCESS,
      data: {
        review,
      },
    });
  };
}

export function loadReviewCommentsReplies({ review, comment, page = 1, shift = false, push = false }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/reviews/${review.id}/comments/${comment.id}/children`;

    try {
      const comments = await fetch(uri, {
        method: 'get',
        data: {
          page,
        },
        state,
      });

      dispatch({
        type: REVIEW_COMMENTS_REPLIES_LOAD_SUCCESS,
        data: {
          review,
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

export function loadReviewComments({ review, page = 1, shift = false, push = false, replace = false }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/reviews/${review.id}/comments`;

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
        type: REVIEW_COMMENTS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
          review,
        },
        push,
        shift,
        replace,
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  };
}

export function createReviewComment({ review, text, parentComment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/reviews/${review.id}/comments`;
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
        type: REVIEW_COMMENT_CREATE_SUCCESS,
        data: {
          review,
          comment,
        },
      });

      return comment;
    } catch (error) {
      dispatch({
        type: REVIEW_COMMENT_CREATE_FAIL,
      });
      console.error(error);
      return undefined;
    }
  };
}

export function editReviewComment({ review, comment, text }) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/reviews/${review.id}/comments/${comment.id}`;

    try {
      const updatedComment = await fetch(uri, {
        method: 'patch',
        data: {
          text,
        },
        state,
      });

      dispatch({
        type: REVIEW_COMMENT_EDIT_SUCCESS,
        data: {
          review,
          comment: updatedComment,
          text,
        },
      });

      return updatedComment;
    } catch (error) {
      dispatch({
        type: REVIEW_COMMENT_EDIT_FAIL,
      });
      console.error(error);
      return undefined;
    }
  };
}

export function removeReviewComment({ review, comment }) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/reviews/${review.id}/comments/${comment.id}`;

    try {
      await fetch(uri, {
        method: 'delete',
        parse: false,
        state,
      });

      dispatch({
        type: REVIEW_COMMENT_REMOVE_SUCCESS,
        data: {
          review,
          comment,
        },
      });
    } catch (error) {
      dispatch({
        type: REVIEW_COMMENT_REMOVE_FAIL,
      });
      console.error(error);
    }
  };
}

export function likeReviewComment({ review, comment }) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/reviews/${review.id}/comments/${comment.id}/likes`;

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

export function removeLikeReviewComment({ review, comment }) {
  return async (dispatch, getState) => {
    const state = getState();

    const { currentUser } = state;

    const uri = `/api/reviews/${review.id}/comments/${comment.id}/likes/${currentUser.id}`;

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
