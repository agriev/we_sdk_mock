/* eslint-disable import/prefer-default-export */

import fetch from 'tools/fetch';

export function sendTokens(data) {
  return async (dispatch, getState) => {
    const uri = '/api/tokens/send';
    const state = getState();
    const method = 'post';

    return fetch(uri, { method, data, state });
  };
}
