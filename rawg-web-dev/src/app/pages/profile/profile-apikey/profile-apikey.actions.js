/* eslint-disable import/prefer-default-export */

import { CURRENT_USER_UPDATE_SUCCESS } from 'app/components/current-user/current-user.actions';
import fetch from 'tools/fetch';

export function refreshApiKey() {
  return async (dispatch, getState) => {
    const state = getState();

    const { currentUser } = state;

    const res = await fetch(`/api/users/${currentUser.id}`, {
      method: 'patch',
      data: {
        api_key: '',
      },
      state,
    });

    dispatch({
      type: CURRENT_USER_UPDATE_SUCCESS,
      data: res,
    });

    return res;
  };
}

export function getRequestsStats() {
  return async (dispatch, getState) => {
    const state = getState();
    return fetch('/api/users/current/api-requests', {
      method: 'get',
      data: {},
      state,
    });
  };
}
