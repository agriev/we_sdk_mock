import { push, goBack } from 'react-router-redux';

import fetch from 'tools/fetch';

import paths from 'config/paths';

export const REVIEW_SAVE = 'REVIEW_SAVE';
export const REVIEW_SAVE_FAIL = 'REVIEW_SAVE_FAIL';
export const REVIEW_CLEAN = 'REVIEW_CLEAN';

export function createReview({
  id,
  text,
  rating,
  reactions,
  facebook,
  twitter,
  redirect = false,
  isBack = true,
  addToLibrary = false,
}) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/reviews';

    dispatch({
      type: REVIEW_SAVE,
    });

    try {
      const review = await fetch(uri, {
        method: 'post',
        data: {
          game: id,
          text,
          rating,
          reactions,
          post_facebook: facebook,
          post_twitter: twitter,
          add_to_library: addToLibrary,
        },
        state,
      });

      if (redirect) {
        dispatch(push(paths.review(review.id)));
        return undefined;
      }

      if (window.history.length > 1 && isBack) {
        dispatch(goBack());
      }

      return review;
    } catch (error) {
      dispatch({
        type: REVIEW_SAVE_FAIL,
        data: error && error.errors,
      });

      if (error.status === 400) {
        return undefined;
      }

      throw error;
    }
  };
}

export function editReview({ id, text, rating, reactions, facebook, twitter, redirect = false, isBack = true }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/reviews/${id}`;

    dispatch({
      type: REVIEW_SAVE,
    });

    try {
      const review = await fetch(uri, {
        method: 'patch',
        data: {
          text,
          rating,
          reactions,
          post_facebook: facebook,
          post_twitter: twitter,
        },
        state,
      });

      if (redirect) {
        dispatch(push(paths.review(review.id)));

        return undefined;
      }

      if (window.history.length > 1 && isBack) {
        dispatch(goBack());
      }

      return review;
    } catch (error) {
      dispatch({
        type: REVIEW_SAVE_FAIL,
        data: error && error.errors,
      });

      throw error;
    }
  };
}

export function cleanReview() {
  return async (dispatch /* getState */) => {
    dispatch({
      type: REVIEW_CLEAN,
    });
  };
}

export function checkSocialRights() {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = '/api/auth/social/write';

    return fetch(uri, {
      method: 'get',
      state,
    });
  };
}
