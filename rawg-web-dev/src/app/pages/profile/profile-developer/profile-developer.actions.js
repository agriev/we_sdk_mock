/* eslint-disable import/prefer-default-export */

import { CURRENT_USER_UPDATE_SUCCESS } from 'app/components/current-user/current-user.actions';
import fetch from 'tools/fetch';

export function save(values) {
  return async (dispatch, getState) => {
    const state = getState();

    const { currentUser } = state;

    const res = await fetch(`/api/users/${currentUser.id}`, {
      method: 'patch',
      data: {
        full_name: values.full_name,
        api_email: values.api_email,
        api_description: values.api_description,
        api_url: values.api_url,
      },
      state,
    });

    dispatch({
      type: CURRENT_USER_UPDATE_SUCCESS,
      data: res,
    });
  };
}
