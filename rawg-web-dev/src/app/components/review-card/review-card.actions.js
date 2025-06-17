import fetch from 'tools/fetch';
import isPlainObject from 'lodash/isPlainObject';

export const REVIEW_REMOVED = 'REVIEW_REMOVED';

export function removeReview(review) {
  return async (dispatch, getState) => {
    const state = getState();

    if (!isPlainObject(review)) {
      return new Promise((resolve) => {
        resolve();
      });
    }

    const method = 'delete';
    const parse = false;

    await fetch(`/api/reviews/${review.id}`, { method, parse, state });

    dispatch({
      type: REVIEW_REMOVED,
      data: {
        review,
      },
    });
  };
}

export function like(id) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/reviews/${id}/likes`;

    return fetch(uri, {
      method: 'post',
      data: {
        positive: true,
      },
      state,
    });
  };
}

export function dislike(id) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/reviews/${id}/likes`;

    return fetch(uri, {
      method: 'post',
      data: {
        positive: false,
      },
      state,
    });
  };
}

export function removeLike(id) {
  return async (dispatch, getState) => {
    const state = getState();

    const { currentUser } = state;

    const uri = `/api/reviews/${id}/likes/${currentUser.id}`;

    return fetch(uri, {
      method: 'delete',
      parse: false,
      state,
    });
  };
}
