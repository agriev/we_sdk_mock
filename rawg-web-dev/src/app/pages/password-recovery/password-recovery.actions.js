/* eslint-disable import/prefer-default-export */

import fetch from 'tools/fetch';

export function passwordRecovery(values) {
  return async (dispatch, getState) => {
    const uri = '/api/auth/password/reset';
    const state = getState();

    return fetch(uri, {
      method: 'post',
      data: values,
      state,
    });
  };
}
