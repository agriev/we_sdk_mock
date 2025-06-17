import { push, goBack } from 'react-router-redux';

import fetch from 'tools/fetch';

import paths from 'config/paths';

export const POST_SAVE = 'POST_SAVE';
export const POST_SAVE_FAIL = 'POST_SAVE_FAIL';
export const POST_CLEAN = 'POST_CLEAN';

export function createPost({ game, title, text, facebook, twitter, redirect = true }) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = '/api/discussions';

    dispatch({
      type: POST_SAVE,
    });

    try {
      const post = await fetch(uri, {
        method: 'post',
        data: {
          game: game.id,
          title,
          text,
          post_facebook: facebook,
          post_twitter: twitter,
        },
        state,
      });

      if (redirect) {
        dispatch(push(paths.post(post.id)));
        return undefined;
      }

      return post;
    } catch (error) {
      dispatch({
        type: POST_SAVE_FAIL,
        data: error && error.errors,
      });

      throw error;
    }
  };
}

export function editPost({ id, title, text, facebook, twitter }) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/discussions/${id}`;

    dispatch({
      type: POST_SAVE,
    });

    try {
      const post = await fetch(uri, {
        method: 'patch',
        data: {
          title,
          text,
          post_facebook: facebook,
          post_twitter: twitter,
        },
        state,
      });

      if (window.history.length > 1) {
        dispatch(goBack());
      } else {
        dispatch(push(paths.post(post.id)));
      }
    } catch (error) {
      dispatch({
        type: POST_SAVE_FAIL,
        data: error && error.errors,
      });

      throw error;
    }
  };
}

export function cleanPost() {
  return async (dispatch /* , getState */) => {
    dispatch({
      type: POST_CLEAN,
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
