/* eslint-disable no-console */

import fetch from 'tools/fetch';

import * as Sentry from '@sentry/browser';
import cookies from 'browser-cookies';
import config from 'config/config';
import env from 'config/env';

import get from 'lodash/get';

import getGAId from 'tools/get-ga-id';
import storage from 'tools/storage';
import checkLogin from 'tools/check-login';
import { throwEvent } from 'scripts/analytics-helper';

export const CURRENT_USER_LOAD_SUCCESS = 'CURRENT_USER_LOAD_SUCCESS';
export const CURRENT_USER_UPDATE_SUCCESS = 'CURRENT_USER_UPDATE_SUCCESS';
export const CURRENT_USER_LOGOUT = 'CURRENT_USER_LOGOUT';
export const CURRENT_USER_DISCONNECT_SUCCESS = 'CURRENT_USER_DISCONNECT_SUCCESS';
export const CURRENT_USER_STEAM_AUTH_SUCCESS = 'CURRENT_USER_STEAM_AUTH_SUCCESS';
export const CURRENT_USER_UPDATE_RATED_GAMES_PERCENT = 'CURRENT_USER_UPDATE_RATED_GAMES_PERCENT';
export const CURRENT_USER_UPDATE_LOYALTY = 'CURRENT_USER_UPDATE_LOYALTY';

export const updateCurrentUser = (data) => ({
  type: CURRENT_USER_UPDATE_SUCCESS,
  data,
});

export function steamAuth(steamId) {
  return (dispatch) =>
    dispatch({
      type: CURRENT_USER_STEAM_AUTH_SUCCESS,
      data: steamId,
    });
}

export function logout({ checkPagePrivacy = true } = {}) {
  return async (dispatch, getState) => {
    const state = getState();

    Sentry.setUser({
      id: '',
      username: '',
      email: '',
    });

    dispatch({
      type: CURRENT_USER_LOGOUT,
    });

    if (checkPagePrivacy && state.app.currentPageIsPrivate) {
      checkLogin(dispatch);
    }
  };
}

export function loadCurrentUser() {
  return async (dispatch, getState) => {
    const state = getState();
    const gaId = getGAId(state.app.request.cookies);
    let userUri = '/api/users/current';

    if (gaId) {
      userUri = `${userUri}?_ga=${gaId}`;
    }

    const response = await fetch(userUri, {
      checkResult: false,
      method: 'get',
      state,
      returnBeforeParse: true,
    });

    if (response.status !== 200) {
      if (env.isClient()) {
        dispatch(logout());
      }

      return;
    }

    const data = await response.json();

    if (config.sentryEnabled) {
      Sentry.setUser({
        id: data.id,
        email: data.email,
        username: data.full_name || data.username,
      });
    }

    try {
      await dispatch({
        data: await fetch('/api/payment/loyalty/on_logins', {
          method: 'get',
          state,
        }),

        type: CURRENT_USER_UPDATE_LOYALTY,
      });
    } catch (e) {
      console.log(e);
    }

    dispatch({
      type: CURRENT_USER_LOAD_SUCCESS,
      data,
    });
  };
}

export function grabLoyaltyBonuses() {
  return async (dispatch, getState) => {
    const state = getState();
    console.log('trigger');

    try {
      await fetch('/api/payment/loyalty/on_logins', {
        returnBeforeParse: true,
        method: 'post',
        state,
      });

      await dispatch({
        data: {
          duration: 0,
        },

        type: CURRENT_USER_UPDATE_LOYALTY,
      });

      await dispatch(loadCurrentUser());
    } catch (e) {
      console.log(e);
    }
  };
}

export function disconnectSocialAccount(provider) {
  return async (dispatch, getState) => {
    const state = getState();

    const uri = `/api/auth/${provider}`;

    return fetch(uri, {
      method: 'delete',
      parse: false,
      state,
    }).then(() => {
      dispatch({
        type: CURRENT_USER_DISCONNECT_SUCCESS,
        data: {
          provider,
        },
      });
    });
  };
}

export function updateSetting(key, value) {
  return async (dispatch, getState) => {
    const state = getState();
    const uri = '/api/users/current/setting';
    const currentSettings = get(state, 'currentUser.settings') || {};

    dispatch({
      type: CURRENT_USER_UPDATE_SUCCESS,
      data: {
        settings: {
          ...currentSettings,
          [key]: value,
        },
      },
    });

    return fetch(uri, {
      method: 'post',
      data: {
        key,
        value,
      },
      state,
    });
  };
}

export function updateRatedGamesPercent(percent) {
  return async (dispatch) => {
    dispatch({
      type: CURRENT_USER_UPDATE_RATED_GAMES_PERCENT,
      data: {
        percent,
      },
    });
  };
}

export const getBannerKey = (name) => {
  return `banner${name}Disabled`;
};

export function hideBanner(name) {
  return async (dispatch, getState) => {
    const updater = updateSetting(getBannerKey(name), true);

    return updater(dispatch, getState);
  };
}

export function markUserIsStaff() {
  return async (dispatch, getState) => {
    const { currentUser } = getState();

    if (currentUser.id && currentUser.is_staff && env.isClient()) {
      cookies.set('is_staff', 'true', { expires: 365 });
    }
  };
}

const GaAuthenticatedKey = 'ga-authenticated';

export function markUserGAuthenticated() {
  return async (dispatch, getState) => {
    const { currentUser } = getState();

    if (
      currentUser.id &&
      env.isClient() &&
      config.analyticsEnabled &&
      typeof window.ga !== 'undefined' &&
      storage.get(GaAuthenticatedKey) !== true
    ) {
      ga('set', 'dimension1', 'Authenticated');
      throwEvent({
        category: 'Misc',
        action: 'AuthTracking',
      });

      storage.set(GaAuthenticatedKey, true);
    }
  };
}
