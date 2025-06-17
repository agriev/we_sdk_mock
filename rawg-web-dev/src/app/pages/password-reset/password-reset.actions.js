/* eslint-disable import/prefer-default-export */

import { push } from 'react-router-redux';

import fetch from 'tools/fetch';

import paths from 'config/paths';

import { saveRedirectPage } from 'app/pages/app/app.actions';

export function passwordReset(values, { uid, token }) {
  return async (dispatch, getState) => {
    const uri = '/api/auth/password/reset/confirm';
    const state = getState();

    return fetch(uri, {
      method: 'post',
      data: {
        ...values,
        uid,
        token,
      },
      parse: false,
      state,
    }).then(() => {
      dispatch(saveRedirectPage({ pathname: '/', force: true }));
      dispatch(push(paths.login));
    });
  };
}
