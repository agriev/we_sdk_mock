/* eslint-disable no-console */

import urlParse from 'url-parse';
import { push as routerPush } from 'react-router-redux';

import fetch from 'tools/fetch';

import paths from 'config/paths';

export const GAMECARD_COMMENTS_REPLIES_LOAD_SUCCESS = 'GAMECARD_COMMENTS_REPLIES_LOAD_SUCCESS';
export const GAMECARD_COMMENTS_LOAD_SUCCESS = 'GAMECARD_COMMENTS_LOAD_SUCCESS';
export const GAMECARD_COMMENT_CREATE_SUCCESS = 'GAMECARD_COMMENT_CREATE_SUCCESS';
export const GAMECARD_COMMENT_CREATE_FAIL = 'GAMECARD_COMMENT_CREATE_FAIL';
export const GAMECARD_COMMENT_EDIT_SUCCESS = 'GAMECARD_COMMENT_EDIT_SUCCESS';
export const GAMECARD_COMMENT_EDIT_FAIL = 'GAMECARD_COMMENT_EDIT_FAIL';
export const GAMECARD_COMMENT_REMOVE_SUCCESS = 'GAMECARD_COMMENT_REMOVE_SUCCESS';
export const GAMECARD_COMMENT_REMOVE_FAIL = 'GAMECARD_COMMENT_REMOVE_FAIL';

export function goToGameCardComment({ review, comment }) {
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

export function loadGameCardCommentsReplies({ gameSlug, comment, page = 1, shift = false, push = false }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${gameSlug}/comments/${comment.id}/children`;

    try {
      const comments = await fetch(uri, {
        method: 'get',
        data: {
          page,
        },
        state,
      });

      dispatch({
        type: GAMECARD_COMMENTS_REPLIES_LOAD_SUCCESS,
        data: {
          gameSlug,
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

export function loadGameCardComments({ gameSlug, page = 1, shift = false, push = false, replace = false }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${gameSlug}/comments`;

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
        type: GAMECARD_COMMENTS_LOAD_SUCCESS,
        data: {
          ...res,
          next: (url && +url.query.page) || null,
          gameSlug,
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

export function createGameCardComment({ gameSlug, text, parentComment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${gameSlug}/comments `;
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
        type: GAMECARD_COMMENT_CREATE_SUCCESS,
        data: {
          gameSlug,
          comment,
        },
      });

      return comment;
    } catch (error) {
      dispatch({
        type: GAMECARD_COMMENT_CREATE_FAIL,
      });
      console.error(error);
      return undefined;
    }
  };
}

export function editGameCardComment({ gameSlug, comment, text }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${gameSlug}/comments/${comment.id} `;

    try {
      const updatedComment = await fetch(uri, {
        method: 'patch',
        data: {
          text,
        },
        state,
      });

      dispatch({
        type: GAMECARD_COMMENT_EDIT_SUCCESS,
        data: {
          gameSlug,
          comment: updatedComment,
          text,
        },
      });

      return updatedComment;
    } catch (error) {
      dispatch({
        type: GAMECARD_COMMENT_EDIT_FAIL,
      });
      console.error(error);
      return undefined;
    }
  };
}

export function removeGameCardComment({ gameSlug, comment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${gameSlug}/comments/${comment.id}`;

    try {
      await fetch(uri, {
        method: 'delete',
        parse: false,
        state,
      });

      dispatch({
        type: GAMECARD_COMMENT_REMOVE_SUCCESS,
        data: {
          gameSlug,
          comment,
        },
      });
    } catch (error) {
      dispatch({
        type: GAMECARD_COMMENT_REMOVE_FAIL,
      });
      console.error(error);
    }
  };
}

export function likeGameCardComment({ gameSlug, comment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/games/${gameSlug}/comments/${comment.id}/likes`;

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

export function removeLikeGameCardComment({ gameSlug, comment }) {
  return async (dispatch, getState) => {
    const state = getState();
    const { currentUser } = state;
    const uri = `/api/games/${gameSlug}/comments/${comment.id}/likes/${currentUser.id}`;

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
