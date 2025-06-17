import { push } from 'react-router-redux';

import fetch from 'tools/fetch';
import getGAId from 'tools/get-ga-id';

import paths from 'config/paths';
import { CURRENT_USER_UPDATE_SUCCESS } from 'app/components/current-user/current-user.actions';

export function changeGameAccounts(values, { redirect = false } = {}) {
  return async (dispatch, getState) => {
    const state = getState();
    const gaId = getGAId(state.app.request.cookies);
    let uri = '/api/users/current';

    if (gaId) {
      uri = `${uri}?_ga=${gaId}`;
    }

    return fetch(uri, {
      method: 'patch',
      data: {
        ...values,
      },
      multipart: values.avatar,
      state,
    }).then((res) => {
      dispatch({
        type: CURRENT_USER_UPDATE_SUCCESS,
        data: {
          ...res,
          rememberedGameAccounts: null,
        },
      });

      if (redirect && state.app.registeredFromTokensPage) {
        dispatch(push(paths.gameAccountsVerification));
      }
    });
  };
}

export function rememberGameAccounts(values) {
  return async (dispatch, getState) =>
    new Promise((resolve) => {
      resolve(values);
    }).then(() => {
      dispatch({
        type: CURRENT_USER_UPDATE_SUCCESS,
        data: {
          rememberedGameAccounts: values,
        },
      });

      const { currentUser } = getState();

      dispatch(push(paths.profile(currentUser.slug)));
    });
}
