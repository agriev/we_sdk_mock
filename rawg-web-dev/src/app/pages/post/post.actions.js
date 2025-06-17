/* eslint-disable no-console */

import fetch from 'tools/fetch';

export const POST_LOAD = 'POST_LOAD';
export const POST_LOAD_SUCCESS = 'POST_LOAD_SUCCESS';

export function loadPost(id, { omitComments = false } = {}) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/discussions/${id}`;

    dispatch({
      type: POST_LOAD,
    });

    const post = await fetch(uri, {
      method: 'get',
      state,
    });

    if (omitComments) {
      delete post.comments;
    }

    dispatch({
      type: POST_LOAD_SUCCESS,
      data: post,
    });

    return post;
  };
}
