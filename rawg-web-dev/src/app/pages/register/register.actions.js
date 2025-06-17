/* eslint-disable import/prefer-default-export */
import cookies from 'browser-cookies';

import fetch from 'tools/fetch';
import compactObject from 'tools/compact-object';
import getGAId from 'tools/get-ga-id';

import paths from 'config/paths';
import { authSuccess } from 'app/pages/app/app.actions';
import { sendOurAnalyticsRate, sendAnalyticsRate } from 'scripts/analytics-helper';

export function register({ data, location, context = 'register', redirect = true } = {}) {
  return async (dispatch, getState) => {
    let uri = '/api/auth/register';
    const method = 'post';
    const state = getState();
    const headers = compactObject({
      'Referer-Referer': cookies.get('referer'),
      'Referer-TRP': cookies.get('referer-trp'),
    });

    const gaId = getGAId(state.app.request.cookies);

    if (gaId) {
      uri = `${uri}?_ga=${gaId}`;
    }

    return fetch(uri, {
      method,
      data,
      state,
      headers,
    }).then((res) => {
      if (location.pathname === paths.rateTopGames) {
        sendAnalyticsRate('signup-complete');
        sendOurAnalyticsRate({
          state,
          slug: location.pathname === paths.rateTopGames ? 'top-100' : undefined,
          action: 'signup-complete',
        });
      }

      cookies.set('just-registered', 'true', { expires: 0 });

      dispatch(
        authSuccess({
          res,
          context,
          redirect,
        }),
      );
    });
  };
}
