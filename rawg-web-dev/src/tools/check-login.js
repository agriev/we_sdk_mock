/* eslint-disable promise/no-callback-in-promise */

import { replace } from 'react-router-redux';

import ErrorUnauthorized from 'interfaces/error-unauthorised';
import { TOGGLE_PROFILE_IFRAME_VISIBILITY } from 'app/pages/app/app.actions';

import { dispatchCustomEvent } from 'tools/dispatch-custom-event';
import config from '../config/config';

function needLogin() {
  return async (dispatch, getState) => {
    const state = getState();

    if (state.currentUser.id) {
      return;
    }

    dispatchCustomEvent({
      el: document,
      eventName: TOGGLE_PROFILE_IFRAME_VISIBILITY,
      detail: {
        state: config.registerLink,
      },
    });

    document.addEventListener(TOGGLE_PROFILE_IFRAME_VISIBILITY, function handleToggle(event) {
      document.removeEventListener(TOGGLE_PROFILE_IFRAME_VISIBILITY, handleToggle);

      if (event.detail.state) {
        return;
      }

      const search = new URLSearchParams(window.location.search);

      if (search.has('redirect')) {
        dispatch(replace('/'));
      }
    });

    throw new ErrorUnauthorized();
  };
}

const checkLogin = (dispatch, callback) => {
  return dispatch(needLogin())
    .then(callback)
    .catch(console.log);
};

export default checkLogin;
