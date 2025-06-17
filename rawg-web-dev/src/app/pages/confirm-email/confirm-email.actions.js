/* eslint-disable import/prefer-default-export, no-console */

import fetch from 'tools/fetch';

import { CURRENT_USER_UPDATE_SUCCESS } from 'app/components/current-user/current-user.actions';

export function confirmEmail(token) {
  return async (dispatch, getState) => {
    const uri = '/api/auth/email/confirm';
    const state = getState();

    return fetch(uri, {
      method: 'post',
      data: {
        key: token,
      },
      parse: false,
      state,
    })
      .then((/* res */) => {
        dispatch({
          type: CURRENT_USER_UPDATE_SUCCESS,
          data: {
            is_active: true,
          },
        });
      })
      .catch((error) => {
        dispatch({
          type: CURRENT_USER_UPDATE_SUCCESS,
          data: {
            is_active: false,
          },
        });

        console.error(error);
      });
  };
}
