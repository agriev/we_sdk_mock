/* eslint-disable no-console */

import React from 'react';
import { push } from 'react-router-redux';
import { FormattedMessage } from 'react-intl';

import fetch from 'tools/fetch';

import {
  addNotification,
  NOTIF_STATUS_SUCCESS,
  NOTIF_STATUS_ERROR,
} from 'app/pages/app/components/notifications/notifications.actions';

import {
  LOCAL_TOKENS_JOIN_ERROR,
  LOCAL_TOKENS_JOIN_SUCCESS,
  LOCAL_TOKENS_REMIND_SUBSCRIBED,
} from 'app/pages/app/components/notifications/notifications.constants';

import { registerFromTokensPage } from 'app/pages/app/app.actions';
import paths from 'config/paths';

import JoinError from './components/join/components/join-error';

export const TOKENS_DASHBOARD_LOAD = 'TOKENS_DASHBOARD_LOAD';
export const TOKENS_DASHBOARD_LOAD_SUCCESS = 'TOKENS_DASHBOARD_LOAD_SUCCESS';
export const TOKENS_DASHBOARD_UPDATE = 'TOKENS_DASHBOARD_LOAD_UPDATE';
export const TOKENS_DASHBOARD_REMIND_BY_EMAIL_SUBSCRIBING = 'TOKENS_DASHBOARD_REMIND_BY_EMAIL_SUBSCRIBING';
export const TOKENS_DASHBOARD_REMIND_BY_EMAIL_SUBSCRIBED = 'TOKENS_DASHBOARD_REMIND_BY_EMAIL_SUBSCRIBED';
export const TOKENS_DASHBOARD_JOINING = 'TOKENS_DASHBOARD_JOINING';
export const TOKENS_DASHBOARD_JOINING_SUCCESS = 'TOKENS_DASHBOARD_JOINING_SUCCESS';
export const TOKENS_DASHBOARD_JOINING_ERROR = 'TOKENS_DASHBOARD_JOINING_ERROR';
export const TOKENS_CONVERT_KARMA = 'TOKENS_CONVERT_KARMA';

export const JOIN_ERROR_NO_ACCOUNTS = 1;
export const JOIN_ERROR_NO_CONFIRMED_ACCOUNTS = 2;

export const updateDashboard = (data) => ({
  type: TOKENS_DASHBOARD_UPDATE,
  data,
});

export function convertingKarma() {
  return async (dispatch, getState) => {
    const uri = '/api/token/reward';
    const state = getState();

    dispatch({
      type: TOKENS_CONVERT_KARMA,
    });

    return fetch(uri, {
      method: 'post',
      state,
    });
  };
}

export function loadCurrentCycle() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/token/cycle';

    dispatch({ type: TOKENS_DASHBOARD_LOAD });

    return fetch(uri, {
      method: 'get',
      state,
    }).then((data) => {
      dispatch({ type: TOKENS_DASHBOARD_LOAD_SUCCESS, data });
    });
  };
}

/**
 * Присоединиться к программе получения токенов
 * Описание логики api:
 * https://3.basecamp.com/3964781/buckets/8033111/todos/1143179331#__recording_1158117327
 */
export function joinProgram() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/token/join';

    if (!state.currentUser.id) {
      dispatch(push(`${paths.register}?tokens`));
      return undefined;
    }

    dispatch({ type: TOKENS_DASHBOARD_JOINING });

    return fetch(uri, {
      method: 'post',
      state,
    })
      .then((/* res */) => {
        dispatch({ type: TOKENS_DASHBOARD_JOINING_SUCCESS });
        dispatch(
          addNotification({
            id: LOCAL_TOKENS_JOIN_SUCCESS,
            weight: 8,
            local: true,
            fixed: true,
            authenticated: true,
            expires: 1,
            status: NOTIF_STATUS_SUCCESS,
            message: <FormattedMessage id="tokens.join_success" />,
          }),
        );
      })
      .catch((error) => {
        if (error.status === 400) {
          dispatch(registerFromTokensPage());
          dispatch({
            type: TOKENS_DASHBOARD_JOINING_ERROR,
            data: {
              text: error.errors.error,
              code: error.errors.code,
            },
          });
          dispatch(
            addNotification({
              id: LOCAL_TOKENS_JOIN_ERROR,
              weight: 8,
              local: true,
              fixed: true,
              authenticated: true,
              expires: 1,
              status: NOTIF_STATUS_ERROR,
              message: <JoinError code={error.errors.code} text={error.errors.error} />,
            }),
          );
        } else {
          throw error;
        }
      });
  };
}

export function remindByEmail() {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/token/subscribe';

    if (state.tokensDashboard.next.subscribed) {
      return undefined;
    }

    dispatch({
      type: TOKENS_DASHBOARD_REMIND_BY_EMAIL_SUBSCRIBING,
    });

    return fetch(uri, {
      method: 'post',
      state,
    }).then(() => {
      dispatch({
        type: TOKENS_DASHBOARD_REMIND_BY_EMAIL_SUBSCRIBED,
      });

      dispatch(
        addNotification({
          id: LOCAL_TOKENS_REMIND_SUBSCRIBED,
          weight: 8,
          authenticated: true,
          expires: 1,
          local: true,
          status: NOTIF_STATUS_SUCCESS,
          message: <FormattedMessage id="tokens.notification_subscribed_on_remind" />,
        }),
      );
    });
  };
}
