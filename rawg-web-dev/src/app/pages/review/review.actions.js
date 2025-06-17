import fetch from 'tools/fetch';

export const REVIEW_LOAD = 'REVIEW_LOAD';
export const REVIEW_LOAD_SUCCESS = 'REVIEW_LOAD_SUCCESS';

export function loadReview(id) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/reviews/${id}`;

    dispatch({
      type: REVIEW_LOAD,
    });

    const review = await fetch(uri, {
      method: 'get',
      state,
    });

    dispatch({
      type: REVIEW_LOAD_SUCCESS,
      data: review,
    });

    return review;
  };
}
