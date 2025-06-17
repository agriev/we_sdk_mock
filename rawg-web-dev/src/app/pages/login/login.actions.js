/* eslint-disable import/prefer-default-export */

import fetch from 'tools/fetch';

import { authSuccess } from 'app/pages/app/app.actions';

export function login({ email, password }, { forward } = {}) {
  return async (dispatch, getState) => {
    const uri = '/api/auth/login';
    const state = getState();
    const res = await fetch(uri, {
      method: 'post',
      data: {
        email,
        password,
      },
      state,
    });

    await dispatch(authSuccess({ res, context: 'login', forward }));
  };
}
