import { push } from 'react-router-redux';

import fetch from 'tools/fetch';
import { logout } from 'app/components/current-user/current-user.actions';
import paths from 'config/paths';

export const deleteProfile = (password) => {
  return async (dispatch, getState) => {
    const state = getState();
    const result = await fetch('/api/users/current/delete', {
      method: 'post',
      state,
      returnBeforeParse: true,
      data: { password },
    });

    if (result.status === 204) {
      dispatch(logout({ checkPagePrivacy: false }));
      dispatch(push(paths.index));

      return true;
    }

    return false;
  };
};
