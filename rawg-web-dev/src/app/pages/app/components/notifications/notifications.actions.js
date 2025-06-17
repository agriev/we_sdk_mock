import React from 'react';
import { FormattedMessage } from 'react-intl';

import storage from 'tools/storage';

import filter from 'lodash/filter';
import some from 'lodash/some';

import fetch from 'tools/fetch';

import { importInProgress } from 'app/pages/accounts-import/accounts-import.helpers';
import {
  FIXED_NOTIFY_WAIT_TIME_MS,
  LOCAL_IMPORT_PROGRESS_ID,
  PUSHER_IMPORT_WAITING_ID,
} from './notifications.constants';

let NotificationsSubscriber;

export function setSubscriber(subscriber) {
  NotificationsSubscriber = subscriber;
}

export const EXPIRES_IMMEDIATELY = 'immediately';

export const NOTIF_STATUS_SUCCESS = 'ready';
export const NOTIF_STATUS_ERROR = 'error';

export const CUSTOM_NOTIFICATION = 'CUSTOM_NOTIFICATION';

export const NOTIFICATIONS_ADD = 'NOTIFICATIONS_ADD';
export const NOTIFICATIONS_UPDATE_BY_FUNC = 'NOTIFICATIONS_UPDATE_BY_FUNC';
export const NOTIFICATIONS_FILTER_BY_FUNC = 'NOTIFICATIONS_FILTER_BY_FUNC';

export function getCustomNotification() {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = '/api/banners/active';

    return fetch(uri, {
      method: 'get',
      state,
    }).then((res) => {
      if (!res.id) return;

      dispatch({
        type: CUSTOM_NOTIFICATION,
        data: res,
      });
    });
  };
}

export function filterNotificationsByFunc(func) {
  return {
    type: NOTIFICATIONS_FILTER_BY_FUNC,
    func,
  };
}

export function updateNotificationsByFunc(func) {
  return {
    type: NOTIFICATIONS_UPDATE_BY_FUNC,
    func,
  };
}

export function removeNotification({
  id,
  channelId,
  local,
  custom,
  expires,
  fixed,
  notifyPusher,
  rememberClose,
  autoCloseTimeoutId,
}) {
  return (dispatch) => {
    if (autoCloseTimeoutId) {
      clearTimeout(autoCloseTimeoutId);
    }

    if (local || custom) {
      if (rememberClose && expires !== EXPIRES_IMMEDIATELY) {
        storage.set(id, {
          disabled: true,
          date: new Date(),
          expires,
        });
      }
    } else if (notifyPusher) {
      const receivedId = channelId || id;
      if (NotificationsSubscriber) {
        NotificationsSubscriber.trigger('client-received', { id: receivedId });
      }
    }

    const del = () => dispatch(filterNotificationsByFunc((notification) => notification.id !== id));

    if (fixed) {
      dispatch(
        updateNotificationsByFunc((notif) => ({
          ...notif,
          deleting: notif.id === id ? true : notif.deleting,
        })),
      );

      setTimeout(del, 500);
    } else {
      del();
    }
  };
}

export function removeNotificationsById(id, rememberClose = true) {
  return (dispatch, getState) => {
    filter(getState().notifications, { id }).forEach((notify) => {
      dispatch(
        removeNotification({
          ...notify,
          rememberClose,
        }),
      );
    });
  };
}

export function addNotification({
  id,
  message,
  status, // 'ready' or 'error'
  custom = false,
  local = false,
  authenticated = true,
  fixed = false,
  autoHideFixed = true,
  expires = 1,
  notifyPusher = false,
  weight = 0,
  closeAfter = FIXED_NOTIFY_WAIT_TIME_MS,
  ...data
}) {
  return (dispatch, getState) => {
    if (some(getState().notifications, { id })) {
      return;
    }

    const saved = storage.get(id);
    let autoCloseTimeoutId;

    if (saved) {
      const now = Math.round(new Date().getTime() / 1000);
      const savedDate = Math.round(new Date(saved.date).getTime() / 1000);
      const expireDate = savedDate + parseInt(saved.expires, 10) * (60 * 60 * 24);

      if (now > expireDate) {
        storage.remove(id);
      } else {
        return;
      }
    }

    if (fixed && autoHideFixed) {
      autoCloseTimeoutId = setTimeout(() => {
        dispatch(removeNotificationsById(id, false));
      }, closeAfter);
    }

    dispatch({
      type: NOTIFICATIONS_ADD,
      data: {
        id,
        message,
        status,
        custom,
        authenticated,
        expires,
        local,
        fixed,
        notifyPusher,
        weight,
        autoCloseTimeoutId,
        ...data,
      },
    });
  };
}

export function checkImportProgress({ force = false, text = 'shared.notifications_import_progress', values } = {}) {
  return async (dispatch, getState) => {
    /* eslint-disable camelcase */
    const state = getState();
    const { currentUser, notifications } = state;
    const { slug } = currentUser;

    if (force || importInProgress(currentUser)) {
      const fetchImportStatus = fetch(`/api/users/${slug}/import-waiting`, { state });

      fetchImportStatus.then(({ position_in_queue, approximate_seconds }) => {
        if (position_in_queue <= 1) {
          if (some(notifications, { id: LOCAL_IMPORT_PROGRESS_ID })) return;
          if (some(notifications, { id: PUSHER_IMPORT_WAITING_ID })) return;
          // if (cookies.get(IMPORT_PROGRESS_ID)) return;

          dispatch(
            addNotification({
              id: LOCAL_IMPORT_PROGRESS_ID,
              weight: 6,
              authenticated: true,
              // expires: 1,
              local: true,
              fixed: true,
              autoHideFixed: false,
              message: <FormattedMessage id={text} values={values} />,
              status: NOTIF_STATUS_SUCCESS,
            }),
          );
        } else if (NotificationsSubscriber) {
          NotificationsSubscriber.addImportWaitingNotification({
            position_in_queue,
            approximate_seconds,
          });
        }
      });
    }
  };
}
