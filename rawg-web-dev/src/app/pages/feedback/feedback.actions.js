/* eslint-disable import/prefer-default-export */

import fetch from 'tools/fetch';

export function sendFeedback(values) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/feedback';

    return fetch(uri, {
      method: 'post',
      data: {
        ...values,
      },
      state,
    });
  };
}
