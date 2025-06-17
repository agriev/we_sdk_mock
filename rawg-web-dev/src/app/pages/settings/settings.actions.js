import fetch from 'tools/fetch';

import { CURRENT_USER_UPDATE_SUCCESS } from 'app/components/current-user/current-user.actions';

function updateUser(values) {
  return async (dispatch, getState) => {
    const state = getState();
    const {
      currentUser: { id },
    } = state;

    return fetch(`/api/users/${id}`, {
      method: 'patch',
      data: values,
      multipart: values.avatar,
      state,
    }).then((res) => {
      dispatch({
        type: CURRENT_USER_UPDATE_SUCCESS,
        data: res,
      });
      return res;
    });
  };
}

export function changeInfo(values) {
  // eslint-disable-next-line no-unused-vars
  return async (dispatch, getState) => dispatch(updateUser(values));
}

export function changePassword(values) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/auth/password/change';

    return fetch(uri, {
      method: 'patch',
      data: values,
      state,
    });
  };
}

export function changeEmail(values) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/auth/email/change';

    return fetch(uri, {
      method: 'patch',
      data: values,
      state,
    });
  };
}

export function resendConfirmationEmail() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/auth/email/request-confirm';

    return fetch(uri, {
      method: 'post',
      state,
    });
  };
}

export function loadNotificationsStatusesFromMail({ user_id: userId, slug, hash, email }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/unsubscribe/${userId}?slug=${slug}&hash=${hash}&email=${email}`;

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      dispatch({
        type: CURRENT_USER_UPDATE_SUCCESS,
        data: {
          subscribe_mail_synchronization: res.subscribe_mail_synchronization,
          subscribe_mail_reviews_invite: res.subscribe_mail_reviews_invite,
          subscribe_mail_recommendations: res.subscribe_mail_recommendations,
        },
      });
      return res;
    });
  };
}

export function changeNotificationFromMail({ user_id: userId, hash, values }) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = `/api/unsubscribe/${userId}/${hash}`;

    return fetch(uri, {
      method: 'patch',
      data: values,
      state,
    }).then(() => {
      dispatch({
        type: CURRENT_USER_UPDATE_SUCCESS,
        data: values,
      });
    });
  };
}
